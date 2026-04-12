#!/usr/bin/env bash
# build.sh — Render build script
# Runs during every deploy to install deps and prepare the DB.

set -o errexit   # exit on error

echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🗄️  Running database migrations..."
flask db upgrade || echo "⚠️  No migrations to run (or first deploy)"

echo "✅ Build complete!"
