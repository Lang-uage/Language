# Build stage
FROM node:lts-bookworm-slim as builder-base

# Set working directory
WORKDIR /frontend

# Copy frontend source
COPY src/frontend .

# Install dependencies and build
RUN npm install && npm run build

# Runtime stage
FROM nginxinc/nginx-unprivileged:stable-bookworm-perl

# Copy built frontend files
COPY --from=builder-base --chown=nginx /frontend/build /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=nginx ./docker/frontend/start-nginx.sh /start-nginx.sh
COPY --chown=nginx ./docker/frontend/default.conf.template /etc/nginx/conf.d/default.conf.template

# Make start script executable
RUN chmod +x /start-nginx.sh

# Expose port 3000
EXPOSE 3000

# Start nginx
CMD ["/start-nginx.sh"] 