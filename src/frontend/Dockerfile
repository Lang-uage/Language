FROM node:20-alpine as frontend_build
ARG BACKEND_URL=https://backend-6hv8c.ondigitalocean.app/
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm install

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

FROM nginx
COPY --from=frontend_build /app/build/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh
ENV BACKEND_URL=$BACKEND_URL
CMD ["/start-nginx.sh"]
