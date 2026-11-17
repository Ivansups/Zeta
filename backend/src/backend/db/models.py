"""Registry importing all ORM models for Alembic autogenerate discovery.

Models must be imported here so Base.metadata is populated. Import new models
here when a module gets its first model.
"""

from backend.auth import models as auth_models  # noqa: F401
from backend.homework import models as homework_models  # noqa: F401
from backend.schedule import db_models as schedule_models  # noqa: F401
