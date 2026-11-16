"""Import every module that defines ORM models so Alembic autogenerate sees them.

Add `from backend.<module> import models as <module>_models  # noqa: F401`
here when a module gets its first model.
"""

from backend.auth import models as auth_models  # noqa: F401
from backend.homework import models as homework_models  # noqa: F401
from backend.schedule import db_models as schedule_models  # noqa: F401
