#!/usr/bin/env bash
#
# run_frontend.sh
#
# Builds and runs the Langflow frontend Docker container.
#
# Usage:
#   chmod +x run_frontend.sh
#   ./run_frontend.sh

set -euo pipefail

# You can change these names if you like
IMAGE_NAME="langflow-frontend"
CONTAINER_NAME="langflow-frontend-container"
BACKEND_URL=${BACKEND_URL:-"http://localhost:7860"}

# Create .env file for frontend if it doesn't exist
if [ ! -f src/frontend/.env ]; then
    echo "Creating frontend .env file..."
    mkdir -p src/frontend
    cat > src/frontend/.env << EOL
VITE_BACKEND_URL=${BACKEND_URL}
EOL
fi

# 1) Build the Docker image
echo "Building Docker image '${IMAGE_NAME}'..."
docker build -t "${IMAGE_NAME}" -f src/frontend/Dockerfile .

# 2) If a container with the same name is already running, stop and remove it
if docker ps --filter "name=${CONTAINER_NAME}" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping and removing existing container '${CONTAINER_NAME}'..."
  docker rm -f "${CONTAINER_NAME}"
fi

# 3) Run the container in detached mode, mapping port 3000
echo "Starting container '${CONTAINER_NAME}' (accessible at http://localhost:3000)..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p 3000:3000 \
  --env-file src/frontend/.env \
  "${IMAGE_NAME}"

echo "✅ Langflow frontend is now running. Visit: http://localhost:3000"
echo "🔗 Connected to backend at: ${BACKEND_URL}" 