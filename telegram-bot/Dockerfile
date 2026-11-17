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

CMD ["uv", "run", "python", "-m", "telegram_bot.main"]
