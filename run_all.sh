#!/usr/bin/env bash
#
# run_all.sh
#
# Builds and runs both Langflow frontend and backend Docker containers.
#
# Usage:
#   chmod +x run_all.sh
#   ./run_all.sh

set -euo pipefail

# Make scripts executable
chmod +x run_backend.sh
chmod +x run_frontend.sh

# Run backend first
echo "🚀 Starting backend..."
./run_backend.sh

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Run frontend
echo "🚀 Starting frontend..."
./run_frontend.sh

echo "✅ Both services are now running!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:7860" 