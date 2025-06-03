#!/bin/bash
# Custom Langflow Deployment Script

# Stop existing container if running
docker stop langflow-custom 2>/dev/null
docker rm langflow-custom 2>/dev/null

echo "Building custom Langflow image..."
cd ..
docker build -t langflow-custom .
cd deploy

# Start Langflow with SQLite and memory cache
echo "Starting custom Langflow..."
docker run -d \
  --name langflow-custom \
  -p 7860:7860 \
  -e LANGFLOW_DATABASE_URL=sqlite:///./langflow.db \
  -e LANGFLOW_CACHE_TYPE=memory \
  -e LANGFLOW_AUTO_LOGIN=true \
  -e LANGFLOW_SUPERUSER=admin \
  -e LANGFLOW_SUPERUSER_PASSWORD=admin123 \
  -e LANGFLOW_SECRET_KEY=langflow-secret-key \
  -e LANGFLOW_CONFIG_DIR=/tmp/langflow \
  langflow-custom

# Wait for container to start
echo "Waiting for custom Langflow to start..."

# Check every 10 seconds for up to 2 minutes
for i in {1..12}; do
    sleep 10
    if curl -f http://localhost:7860/health >/dev/null 2>&1; then
        echo "✅ Custom Langflow is running successfully!"
        echo "🌐 Access it at: http://localhost:7860"
        echo "👤 Login: admin / admin123"
        echo "🔧 Custom modifications included!"
        echo "🔍 API endpoints available at http://localhost:7860/api/v1/"
        exit 0
    fi
    echo "Still starting... ($((i*10))s elapsed)"
done

# If we get here, it failed to start within 2 minutes
echo "❌ Custom Langflow failed to start within 2 minutes"
echo "Check logs with: docker logs langflow-custom" 