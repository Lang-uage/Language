# syntax=docker/dockerfile:1

############################
# 1) Build the Frontend
############################
FROM node:20-bookworm-slim AS frontend_build
WORKDIR /app/frontend

# Copy only package & config files first for better caching
COPY src/frontend/package*.json \
     src/frontend/tsconfig.json \
     src/frontend/vite.config.mts \
     src/frontend/tailwind.config.mjs \
     src/frontend/postcss.config.js \
     src/frontend/index.html ./

# Install and build
RUN npm ci
COPY src/frontend/src ./src
COPY src/frontend/public ./public
RUN npm run build         # outputs to /app/frontend/dist

############################
# 2) Build the Backend
############################
FROM python:3.11-slim AS backend_build
WORKDIR /app

# System deps for psycopg2 / asyncpg
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy Python dependency specs
COPY pyproject.toml poetry.lock* /app/

# Install Poetry & dependencies (Poetry 2.x)
RUN pip install --no-cache-dir poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-root --without dev

# Copy the rest of your backend code
COPY src/backend/ /app/langflow

############################
# 3) Assemble the Final Image
############################
FROM python:3.11-slim
WORKDIR /app

# Copy virtualenv & code from backend_build
COPY --from=backend_build /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=backend_build /app /app

# Add frontend build into Langflow's static assets
COPY --from=frontend_build /app/frontend/dist /app/langflow/static

# Make sure the venv's binaries are on PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV LANGFLOW_HOST=0.0.0.0
ENV LANGFLOW_LOG_ENV=container

# Expose the port Railway will provide
EXPOSE 7860

# Railway provides $PORT at runtime; migrate & run
CMD ["sh","-c","\
  echo \"Using DB: $LANGFLOW_DATABASE_URL\" && \
  langflow migration --fix --no-input && \
  langflow run --host 0.0.0.0 --port ${PORT:-7860}\
"]
