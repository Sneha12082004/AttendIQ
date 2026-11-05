# AttendIQ — Supabase & PostgreSQL Production Setup Guide

AttendIQ can run completely self-contained in local Demo Mode (`DEMO_MODE=true` in `backend/.env`), or connect to a production Supabase PostgreSQL instance.

---

## Step 1: Create a Supabase Project
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Choose a project name (e.g. `attendiq-prod`) and a secure database password.
4. Select your nearest hosting region.

---

## Step 2: Execute Schema Migration
1. In your Supabase dashboard, navigate to the **SQL Editor** tab on the left sidebar.
2. Click **"New query"**.
3. Copy the entire contents of:
   `backend/supabase_migrations/001_initial_schema.sql`
4. Paste the SQL into the editor and click **Run**.
5. This creates all 12 tables, foreign keys, indexes, and enables Row Level Security (RLS).

---

## Step 3: Retrieve API Keys
1. In the Supabase dashboard, navigate to **Project Settings > API**.
2. Copy:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **Anon Public Key**
   - **Service Role Secret Key** (used strictly by the backend for biometric template operations)

---

## Step 4: Configure Backend Environment
Edit `backend/.env`:
```ini
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here
DEMO_MODE=false
```

Restart the FastAPI backend (`./run.sh`). The backend will automatically connect to your live Supabase database!
