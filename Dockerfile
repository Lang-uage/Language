# Use Python 3.10 as base image since it's required by the project
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    LANGFLOW_LOG_ENV=container

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Python dependencies using uv (as specified in pyproject.toml)
RUN pip install uv && \
    uv pip install --system -e .

# Create necessary directories
RUN mkdir -p /app/flows /app/langflow-config-dir

# Expose the port Langflow runs on
EXPOSE 7860

# Set the command to run Langflow
CMD ["langflow", "run", "--host", "0.0.0.0", "--port", "7860"] 