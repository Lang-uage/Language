FROM node:20-alpine AS frontend_build
WORKDIR /app

# 1.1) Copy only package.json + lockfile for caching
COPY package.json package-lock.json ./
RUN npm ci

# 1.2) Copy all source files & build static assets
COPY . .
RUN npm run build


############################
# Stage 2: Serve with Nginx
############################
FROM nginx:alpine

# 2.1) Copy built static files from previous stage
COPY --from=frontend_build /app/build/ /usr/share/nginx/html/

# 2.2) Copy our custom nginx.conf (which contains the __BACKEND_URL__ placeholder)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 2.3) Copy the start-up script and make it executable
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

# 2.4) Expose port 3000
EXPOSE 3000

# 2.5) Allow BACKEND_URL to be overridden at runtime (defaults can be passed as a build arg if you wish)
ENV BACKEND_URL=https://backend-6hv8c.ondigitalocean.app/

# 2.6) Run our startup script (which patches in BACKEND_URL) then launches Nginx
CMD ["/start-nginx.sh"]
