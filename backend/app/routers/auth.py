"""
app/routers/auth.py
───────────────────
Authentication endpoints: Login, Current User, Token Refresh, and Demo Accounts.
"""

from datetime import timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.auth import create_access_token, verify_password, get_current_user
from app.config import settings
from app.database import get_db
from app.models import Token, UserResponse, UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]
    profile: Optional[Dict[str, Any]] = None


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Authenticates student, faculty, or admin and issues JWT bearer token."""
    db = get_db()
    res = db.table("users").select("*").eq("email", credentials.email.strip().lower()).execute()
    users = res.data if hasattr(res, "data") else []

    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Verify email and password.",
        )

    user = users[0]
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Verify email and password.",
        )

    # Fetch corresponding profile (student or faculty)
    profile = None
    role = user.get("role")
    if role == UserRole.student.value:
        s_res = db.table("students").select("*").eq("user_id", user["id"]).execute()
        if s_res.data:
            profile = s_res.data[0]
    elif role in [UserRole.faculty.value, UserRole.admin.value]:
        f_res = db.table("faculty").select("*").eq("user_id", user["id"]).execute()
        if f_res.data:
            profile = f_res.data[0]

    token_data = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user.get("full_name", ""),
    }
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )

    safe_user = {k: v for k, v in user.items() if k != "password_hash"}

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": safe_user,
        "profile": profile,
    }


@router.get("/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Returns profile and permission details for the logged-in session."""
    db = get_db()
    role = current_user.get("role")
    profile = None
    if role == UserRole.student.value:
        res = db.table("students").select("*").eq("user_id", current_user["id"]).execute()
        if res.data:
            profile = res.data[0]
    elif role in [UserRole.faculty.value, UserRole.admin.value]:
        res = db.table("faculty").select("*").eq("user_id", current_user["id"]).execute()
        if res.data:
            profile = res.data[0]

    safe_user = {k: v for k, v in current_user.items() if k != "password_hash"}
    return {
        "user": safe_user,
        "profile": profile,
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logs out and records session termination in audit log."""
    db = get_db()
    db.table("audit_logs").insert({
        "action": "USER_LOGOUT",
        "user_id": current_user["id"],
        "role": current_user.get("role"),
        "details": {"email": current_user.get("email")},
    }).execute()
    return {"message": "Logged out successfully"}


@router.get("/demo-accounts")
async def list_demo_accounts():
    """Lists preconfigured demo accounts for judges and evaluators."""
    return {
        "admin": [
            {"email": "admin@attendiq.demo", "role": "admin", "name": "System Administrator", "password": "Demo@123"}
        ],
        "faculty": [
            {"email": "dr.mehta@attendiq.demo", "role": "faculty", "name": "Dr. Priya Mehta", "dept": "Computer Science", "password": "Demo@123"},
            {"email": "prof.kumar@attendiq.demo", "role": "faculty", "name": "Prof. Rajan Kumar", "dept": "Information Technology", "password": "Demo@123"},
            {"email": "dr.sharma@attendiq.demo", "role": "faculty", "name": "Dr. Anjali Sharma", "dept": "Electronics", "password": "Demo@123"},
        ],
        "students": [
            {"email": "student1@attendiq.demo", "role": "student", "name": "Arjun Patel", "reg_no": "CS2024001", "dept": "Computer Science", "password": "Demo@123"},
            {"email": "student2@attendiq.demo", "role": "student", "name": "Priya Sharma", "reg_no": "CS2024002", "dept": "Computer Science", "password": "Demo@123"},
            {"email": "student3@attendiq.demo", "role": "student", "name": "Rahul Verma", "reg_no": "IT2024001", "dept": "Information Technology", "password": "Demo@123"},
            {"email": "student4@attendiq.demo", "role": "student", "name": "Ananya Iyer", "reg_no": "CS2024003", "dept": "Computer Science", "password": "Demo@123"},
        ],
    }
