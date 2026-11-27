"""Permission checkers for schedule modification."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import User


async def assert_can_manage_group_schedule(
    user: User, group_id: uuid.UUID, session: AsyncSession
) -> None:
    """Check if the user is authorized to manage timetable for the given group."""
    if user.role == "admin":
        return

    if user.role == "elder" and user.group_id == group_id:
        return

    if user.role == "helper":
        if user.group_id == group_id:
            return
        # Check helper assignment in GroupHelper if model is present
        import backend.auth.models as auth_models

        group_helper_cls = getattr(auth_models, "GroupHelper", None)
        if group_helper_cls is not None:
            import contextlib

            with contextlib.suppress(Exception):
                from sqlalchemy import select

                stmt = select(group_helper_cls).where(
                    group_helper_cls.user_id == user.id,
                    group_helper_cls.group_id == group_id,
                )
                res = await session.execute(stmt)
                if res.scalar_one_or_none() is not None:
                    return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to manage schedule for this group",
    )
