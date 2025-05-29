# syntax=docker/dockerfile:1
################ FRONTEND ################
FROM node:20-bookworm-slim AS frontend_build
WORKDIR /app/frontend
COPY src/frontend/package*.json src/frontend/tsconfig.json src/frontend/vite.config.mts \
     src/frontend/tailwind.config.mjs src/frontend/postcss.config.js src/frontend/index.html ./
RUN npm ci
COPY src/frontend/src ./src
COPY src/frontend/public ./public
RUN npm run build         # → /app/frontend/build

################ BACKEND #################
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS backend_build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc git && \
    rm -rf /var/lib/apt/lists/*
COPY pyproject.toml uv.lock README.md ./
COPY src/ ./src/
COPY --from=frontend_build /app/frontend/build ./src/backend/langflow/frontend
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-editable

################ RUNTIME #################
FROM python:3.12.3-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 curl git && \
    rm -rf /var/lib/apt/lists/*
COPY --from=backend_build /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# 👉 cache-buster ensures this layer always rebuilds when you need it
ARG DRIVER_VERSION=2
RUN pip install --no-cache-dir psycopg2-binary psycopg[binary] asyncpg

ENV LANGFLOW_HOST=0.0.0.0
ENV LANGFLOW_LOG_ENV=container

CMD ["sh","-c","echo \"DB = $LANGFLOW_DATABASE_URL\" && \
      langflow migration --fix --no-input && \
      langflow run --host 0.0.0.0 --port ${PORT}"]
