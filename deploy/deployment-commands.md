# Langflow Deployment Commands

## Start the services
```bash
docker-compose -f docker-compose-standalone.yml up -d
```

## Check service status
```bash
docker-compose -f docker-compose-standalone.yml ps
```

## View logs
```bash
docker-compose -f docker-compose-standalone.yml logs -f langflow
```

## Stop the services
```bash
docker-compose -f docker-compose-standalone.yml down
```

## Stop and remove all data (caution: this deletes your flows!)
```bash
docker-compose -f docker-compose-standalone.yml down -v
```

## Update to latest version
```bash
docker-compose -f docker-compose-standalone.yml pull
docker-compose -f docker-compose-standalone.yml up -d
```

## Access the container for debugging
```bash
docker-compose -f docker-compose-standalone.yml exec langflow bash
```

## View health status
```bash
curl http://localhost:7860/health
```

## Environment Configuration

For custom configuration, you can override environment variables:

```bash
# Custom deployment with your own settings
LANGFLOW_SUPERUSER=myuser LANGFLOW_SUPERUSER_PASSWORD=mypassword docker-compose -f docker-compose-standalone.yml up -d
```

## Data Persistence

Your flows and configurations are stored in the `langflow-data` Docker volume. This persists between container restarts but not if you run `docker-compose down -v`.

## Troubleshooting

1. **Check if port 7860 is available**: `netstat -an | grep 7860`
2. **View detailed logs**: `docker-compose -f docker-compose-standalone.yml logs langflow`
3. **Restart the service**: `docker-compose -f docker-compose-standalone.yml restart langflow` 