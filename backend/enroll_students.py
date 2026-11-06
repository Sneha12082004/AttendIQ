#!/usr/bin/env python3
"""
enroll_students.py
──────────────────
CLI utility to scan backend/enrollment_photos/Sneha_Banerjee and
backend/enrollment_photos/Aastha_Singh, extract face embeddings,
and register them for AttendIQ.

Usage:
    cd backend
    python enroll_students.py
"""

import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.utils.enrollment_manager import enrollment_manager, ENROLLED_IDENTITIES, ENROLLMENT_DIR

def main():
    print("=" * 60)
    print("   AttendIQ Face Enrollment Tool")
    print("   Enrolling: Sneha Banerjee & Aastha Singh")
    print("=" * 60)

    print(f"\nEnrollment directories:")
    for stu_id, meta in ENROLLED_IDENTITIES.items():
        folder = ENROLLMENT_DIR / meta["folder_name"]
        print(f"  • {meta['name']} ({meta['reg_number']}): {folder}")

    print("\nScanning for photographs...")
    updated = enrollment_manager.scan_and_sync_photos()

    print("\nCurrent Enrollment Status:")
    summary = enrollment_manager.get_enrolled_summary()
    for item in summary:
        status_icon = "✅" if item["is_enrolled"] else "❌"
        print(f"  {status_icon} {item['name']} ({item['reg_number']}): {item['source']} (photos: {item['photos_count']})")

    print("\nNote: Any individual appearing on the camera not matching")
    print("Sneha Banerjee or Aastha Singh will be flagged as 'UNKNOWN PERSON'.")
    print("=" * 60)

if __name__ == "__main__":
    main()
