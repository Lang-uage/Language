#!/usr/bin/env bash
#
# run_backend.sh
#
# Builds and runs the Langflow backend Docker container.
#
# Usage:
#   chmod +x run_backend.sh
#   ./run_backend.sh

set -euo pipefail

# You can change these names if you like
IMAGE_NAME="langflow-backend"
CONTAINER_NAME="langflow-backend-container"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
LANGFLOW_HOST=0.0.0.0
LANGFLOW_PORT=7860
LANGFLOW_AUTO_LOGIN=true
LANGFLOW_SAVE_DB_IN_CONFIG_DIR=true
LANGFLOW_BASE_URL=http://localhost:7860
EOL
fi

# 1) Build the Docker image
echo "Building Docker image '${IMAGE_NAME}'..."
docker build -t "${IMAGE_NAME}" .

# 2) If a container with the same name is already running, stop and remove it
if docker ps --filter "name=${CONTAINER_NAME}" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping and removing existing container '${CONTAINER_NAME}'..."
  docker rm -f "${CONTAINER_NAME}"
fi

# 3) Run the container in detached mode, mapping port 7860
echo "Starting container '${CONTAINER_NAME}' (accessible at http://localhost:7860)..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p 7860:7860 \
  --env-file .env \
  -v "$(pwd)/flows:/app/flows" \
  -v "$(pwd)/langflow-config-dir:/app/langflow-config-dir" \
  "${IMAGE_NAME}"

echo "✅ Langflow backend is now running. Visit: http://localhost:7860"
echo "📁 Flows directory mounted at: $(pwd)/flows"
echo "📁 Config directory mounted at: $(pwd)/langflow-config-dir" 