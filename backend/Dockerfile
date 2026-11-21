FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
WORKDIR /app

ENV UV_COMPILE_BYTECODE=0
ENV PYTHONUNBUFFERED=1

# curl is used by container healthchecks
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project --no-cache

COPY alembic.ini ./
COPY migrations ./migrations
COPY src ./src

RUN uv sync --frozen --no-dev --no-cache

RUN useradd -u 10001 -m appuser && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Call the virtualenv binaries directly: `uv run` would resolve and install the
# dev dependency group on every container start, which needs network access.
CMD ["sh", "-c", ".venv/bin/alembic upgrade head && .venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000"]
