#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ -d "venv" ]; then
    source venv/bin/activate
fi

if [ ! -f ".env" ]; then
    cp .env.example .env
fi

echo "Starting AttendIQ FastAPI Backend on http://0.0.0.0:8000 ..."
echo "API Documentation: http://localhost:8000/docs"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
