# backend

FastAPI modular monolith (async) over a single PostgreSQL database. The DB and Alembic are set up in the infra ticket (Z-02).

Owner: Климов.

```bash
uv sync
uv run uvicorn backend.main:app --reload         # http://localhost:8000/docs
uv run pytest
uv run ruff check . && uv run ruff format --check . && uv run mypy .
```
