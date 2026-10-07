# backend

FastAPI modular monolith (async) over a single PostgreSQL database. The other clients (bot, web, mobile) never touch the DB directly.

Owner: Климов.

## Quick start

```bash
cp .env.example .env              # local settings, .env is gitignored
docker compose up -d --wait       # PostgreSQL 17, waits for the healthcheck
uv sync
uv run alembic upgrade head       # apply migrations
uv run uvicorn backend.main:app --reload   # http://localhost:8000/docs
```

Stop the DB: `docker compose down` (add `-v` to also wipe the data volume).

## Checks

```bash
uv run pytest        # integration tests use the `zeta_test` DB, created automatically
uv run ruff check . && uv run ruff format --check . && uv run mypy .
```

Tests need the DB from `docker compose` to be running.

## Database

- `backend.config.Settings` reads `DATABASE_URL` (`postgresql+asyncpg://…`) from the environment or `.env`.
- `backend.db.base.Base` is the declarative base for **all** models. Its naming convention gives constraints and indexes deterministic names: `pk_<table>`, `uq_<table>_<cols>`, `fk_<table>_<cols>_<referred>`, `ck_<table>_<name>`, `ix_<table>_<cols>`. Name `CheckConstraint`s explicitly (`name="positive_price"` becomes `ck_<table>_positive_price`).
- `backend.db.session.get_session` is the FastAPI dependency that yields an `AsyncSession`:

```python
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_session

Session = Annotated[AsyncSession, Depends(get_session)]
```

## Adding a model and a migration

1. Define the model on `Base` in your module (e.g. `backend/users/models.py`).
2. Import that module in `src/backend/db/models.py` so Alembic autogenerate sees it.
3. Generate the revision and **read it before committing**:

   ```bash
   uv run alembic revision --autogenerate -m "create users table"
   uv run alembic upgrade head
   uv run alembic downgrade -1 && uv run alembic upgrade head   # check both directions
   ```

Rules:

- One migration = one meaningful change, with a descriptive message (`add invite_tokens table`, not `update`).
- Never edit a migration that is already merged to `main`; add a new one.
- New revision files are formatted by `ruff` automatically (post-write hook in `alembic.ini`).
- Revision files are named `YYYYMMDD_<rev>_<slug>.py`, so they sort by creation date.
- Two PRs can create revisions from the same parent. If `alembic heads` shows more than one head, the second PR to merge rebases and sets its `down_revision` to the other head.

Useful commands: `alembic current`, `alembic history`, `alembic upgrade head --sql` (print SQL only).
