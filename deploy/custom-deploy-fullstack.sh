#!/bin/bash
# Custom Langflow Fullstack Deployment Script (with custom chat interface)

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
    CONTAINER_NAME="langflow-fullstack"
fi

# Stop existing containers if running
docker stop langflow-custom langflow-fullstack 2>/dev/null
docker rm langflow-custom langflow-fullstack 2>/dev/null

echo "Building custom Langflow fullstack image (this may take a few minutes)..."
cd ..
docker build -f Dockerfile.fullstack -t langflow-custom-fullstack .
cd deploy

# Start Langflow fullstack with environment variables from .env
echo "Starting custom Langflow fullstack with chat interface..."
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
  langflow-custom-fullstack

# Wait for container to start (longer wait for fullstack)
echo "Waiting for custom Langflow fullstack to start..."
echo "This includes building frontend + backend, please wait..."

# Check every 10 seconds for up to 3 minutes
for i in {1..18}; do
    sleep 10
    if curl -f http://localhost:7860/health >/dev/null 2>&1; then
        echo "✅ Custom Langflow fullstack is running successfully!"
        echo "🌐 Access it at: http://localhost:7860"
        echo "👤 Login: $LANGFLOW_SUPERUSER / $LANGFLOW_SUPERUSER_PASSWORD"
        echo "💬 Custom chat interface included!"
        echo "⚙️  Using configuration from .env file"
        echo ""
        echo "🎯 Look for the floating chat button in the bottom-right corner!"
        exit 0
    fi
    echo "Still starting... ($((i*20))s elapsed)"
done

echo "❌ Custom Langflow fullstack failed to start within 3 minutes"
echo "Check logs with: docker logs $CONTAINER_NAME"
echo "Check if frontend built properly" 