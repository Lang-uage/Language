# Langflow Deployment Guide

This directory contains multiple deployment options for Langflow with your custom modifications.

## Environment Configuration

### Using .env File (Recommended)

The `.env` file contains all environment variables used by the deployment scripts and docker-compose files.

**Setup:**
```bash
# Copy the template (already done)
cp environment-template.env .env

# Edit .env file with your preferred settings
nano .env
```

**Key variables to customize:**
- `LANGFLOW_SUPERUSER_PASSWORD`: Change from default "admin123"
- `LANGFLOW_SECRET_KEY`: Use a secure secret for production
- `LANGFLOW_DATABASE_URL`: Switch to PostgreSQL for production
- `LANGFLOW_PORT`: Change if port 7860 is in use

## Deployment Options

### Option 1: Custom Langflow (with your modifications)

**Using docker-compose with .env:**
```bash
docker-compose -f docker-compose-custom.yml up -d
```

**Using deployment script with .env:**
```bash
./custom-deploy-with-env.sh
```

**Using original deployment script:**
```bash
./custom-deploy.sh
```

### Option 2: Official Langflow (Docker Hub image)

**Using docker-compose with .env:**
```bash
docker-compose -f docker-compose-standalone.yml up -d
```

**Using deployment script:**
```bash
./simple-deploy.sh
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LANGFLOW_DATABASE_URL` | `sqlite:///./langflow.db` | Database connection string |
| `LANGFLOW_CACHE_TYPE` | `memory` | Cache type (memory/redis) |
| `LANGFLOW_WORKERS` | `1` | Number of worker processes |
| `LANGFLOW_AUTO_LOGIN` | `true` | Enable automatic login |
| `LANGFLOW_SUPERUSER` | `admin` | Admin username |
| `LANGFLOW_SUPERUSER_PASSWORD` | `admin123` | Admin password |
| `LANGFLOW_SECRET_KEY` | `langflow-secret-key-...` | Application secret key |
| `LANGFLOW_CONFIG_DIR` | `/tmp/langflow` | Configuration directory |
| `LANGFLOW_PORT` | `7860` | Port to expose Langflow on |

## Production Considerations

For production deployments, update these in your `.env` file:

```bash
# Use a strong password
LANGFLOW_SUPERUSER_PASSWORD=your-secure-password

# Use a random secret key
LANGFLOW_SECRET_KEY=your-random-secret-key-here

# Use PostgreSQL for better performance
LANGFLOW_DATABASE_URL=postgresql://user:password@host:5432/langflow

# Use Redis for caching
LANGFLOW_CACHE_TYPE=redis

# Disable auto-login
LANGFLOW_AUTO_LOGIN=false
```

## Troubleshooting

- **Port conflicts**: Change `LANGFLOW_PORT` in `.env`
- **Permission errors**: The deployment uses `/tmp/langflow` for config to avoid permission issues
- **Health check failures**: Wait longer for startup, or check logs with `docker logs <container-name>`

## Quick Start

1. **Edit configuration**: `nano .env`
2. **Deploy custom version**: `./custom-deploy-with-env.sh`
3. **Access**: http://localhost:7860
4. **Login**: Use credentials from your `.env` file