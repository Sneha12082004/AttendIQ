#!/bin/bash
set -e
echo "============================================="
echo "  Setting up AttendIQ Backend Environment"
echo "============================================="

cd "$(dirname "$0")"

# Check Python version
python3 --version

# Create virtualenv if not exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtualenv..."
source venv/bin/activate

echo "Installing backend dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env from .env.example if missing
if [ ! -f ".env" ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env
fi

echo "Backend setup complete! Run ./run.sh to start the API server."
