import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import RoleEnum, User
from backend.auth.security import decode_access_token
from backend.auth.service import AuthService
from backend.config import Settings
from backend.db.session import get_session


def get_settings() -> Settings:
    return Settings()


def get_auth_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(
        session=session,
        jwt_secret_key=settings.jwt_secret_key,
        jwt_algorithm=settings.jwt_algorithm,
        access_token_expire_minutes=settings.access_token_expire_minutes,
        refresh_token_expire_days=settings.refresh_token_expire_days,
    )


async def get_current_user(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
    access_token_cookie: Annotated[str | None, Cookie(alias="access_token")] = None,
) -> User:
    token: str | None = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
    elif access_token_cookie:
        token = access_token_cookie

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(
            token=token,
            secret_key=settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(err),
            headers={"WWW-Authenticate": "Bearer"},
        ) from err

    user_id_str = payload.get("sub")
    token_version = payload.get("tv")

    if not user_id_str or token_version is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims",
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        ) from err

    stmt = select(User).where(User.id == user_uuid)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Проверка актуальности token_version
    if user.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token session has been invalidated",
        )

    return user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles}",
            )
        return current_user

    return role_checker


RequireAdmin = Annotated[User, Depends(require_roles(RoleEnum.ADMIN.value))]
RequireElder = Annotated[
    User, Depends(require_roles(RoleEnum.ADMIN.value, RoleEnum.ELDER.value))
]
RequireHelper = Annotated[
    User,
    Depends(
        require_roles(RoleEnum.ADMIN.value, RoleEnum.ELDER.value, RoleEnum.HELPER.value)
    ),
]
RequireCurator = Annotated[
    User,
    Depends(
        require_roles(
            RoleEnum.ADMIN.value,
            RoleEnum.ELDER.value,
            RoleEnum.HELPER.value,
            RoleEnum.CURATOR.value,
        )
    ),
]
