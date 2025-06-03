#!/bin/bash
# Custom Langflow Deployment Script (with .env support)

# Load environment variables from .env file
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    source .env
else
    echo "Warning: .env file not found. Using default values."
    # Set default values if .env doesn't exist
    LANGFLOW_DATABASE_URL="sqlite:///./langflow.db"
    LANGFLOW_CACHE_TYPE="memory"
    LANGFLOW_AUTO_LOGIN="true"
    LANGFLOW_SUPERUSER="admin"
    LANGFLOW_SUPERUSER_PASSWORD="admin123"
    LANGFLOW_SECRET_KEY="langflow-secret-key"
    LANGFLOW_CONFIG_DIR="/tmp/langflow"
    CONTAINER_NAME="langflow-custom"
fi

# Stop existing container if running
docker stop $CONTAINER_NAME 2>/dev/null
docker rm $CONTAINER_NAME 2>/dev/null

echo "Building custom Langflow image..."
cd ..
docker build -t langflow-custom .
cd deploy

# Start Langflow with environment variables from .env
echo "Starting custom Langflow with .env configuration..."
docker run -d \
  --name $CONTAINER_NAME \
  -p 7860:7860 \
  -e LANGFLOW_DATABASE_URL="$LANGFLOW_DATABASE_URL" \
  -e LANGFLOW_CACHE_TYPE="$LANGFLOW_CACHE_TYPE" \
  -e LANGFLOW_AUTO_LOGIN="$LANGFLOW_AUTO_LOGIN" \
  -e LANGFLOW_SUPERUSER="$LANGFLOW_SUPERUSER" \
  -e LANGFLOW_SUPERUSER_PASSWORD="$LANGFLOW_SUPERUSER_PASSWORD" \
  -e LANGFLOW_SECRET_KEY="$LANGFLOW_SECRET_KEY" \
  -e LANGFLOW_CONFIG_DIR="$LANGFLOW_CONFIG_DIR" \
  langflow-custom

# Wait for container to start
echo "Waiting for custom Langflow to start..."
sleep 15

# Check if it's working
if curl -f http://localhost:7860/health >/dev/null 2>&1; then
  echo "✅ Custom Langflow is running successfully!"
  echo "🌐 Access it at: http://localhost:7860"
  echo "👤 Login: $LANGFLOW_SUPERUSER / $LANGFLOW_SUPERUSER_PASSWORD"
  echo "🔧 Custom modifications included!"
  echo "⚙️  Using configuration from .env file"
else
  echo "❌ Custom Langflow failed to start"
  echo "Check logs with: docker logs $CONTAINER_NAME"
fi 