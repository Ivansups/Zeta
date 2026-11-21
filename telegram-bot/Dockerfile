FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
WORKDIR /app

ENV UV_COMPILE_BYTECODE=0
ENV PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project --no-cache

COPY src ./src

RUN uv sync --frozen --no-dev --no-cache

RUN useradd -u 10001 -m appuser && chown -R appuser:appuser /app
USER appuser

# Call the virtualenv interpreter directly: `uv run` would resolve and install
# the dev dependency group on every container start.
CMD [".venv/bin/python", "-m", "telegram_bot.main"]
