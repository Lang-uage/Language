#!/bin/bash
# Simple Langflow Deployment Script

# Stop existing container if running
docker stop langflow-simple 2>/dev/null
docker rm langflow-simple 2>/dev/null

# Start Langflow with SQLite and memory cache
echo "Starting Langflow..."
docker run -d \
  --name langflow-simple \
  -p 7860:7860 \
  -e LANGFLOW_DATABASE_URL=sqlite:///./langflow.db \
  -e LANGFLOW_CACHE_TYPE=memory \
  -e LANGFLOW_AUTO_LOGIN=true \
  -e LANGFLOW_SUPERUSER=admin \
  -e LANGFLOW_SUPERUSER_PASSWORD=admin123 \
  -e LANGFLOW_SECRET_KEY=langflow-secret-key \
  -e LANGFLOW_CONFIG_DIR=/tmp/langflow \
  langflowai/langflow:latest

# Wait for container to start
echo "Waiting for Langflow to start..."
sleep 10

# Check if it's working
if curl -f http://localhost:7860/health >/dev/null 2>&1; then
  echo "✅ Langflow is running successfully!"
  echo "🌐 Access it at: http://localhost:7860"
  echo "👤 Login: admin / admin123"
else
  echo "❌ Langflow failed to start"
  echo "Check logs with: docker logs langflow-simple"
fi 