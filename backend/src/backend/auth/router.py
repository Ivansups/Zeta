import uuid
from typing import Annotated

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    Header,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import select

from backend.auth.dependencies import (
    RequireAdmin,
    RequireElder,
    get_auth_service,
    get_current_user,
    get_settings,
)
from backend.auth.models import InviteToken, RoleEnum, User
from backend.auth.schemas import (
    ElderInviteCreateRequest,
    GroupCreateRequest,
    GroupResponse,
    InviteResponse,
    RoleInviteCreateRequest,
    StudentInviteCreateRequest,
    TelegramWebAppAuthRequest,
    TelegramWidgetAuthRequest,
    TokenResponse,
    UserResponse,
)
from backend.auth.security import (
    validate_telegram_webapp_init_data,
    validate_telegram_widget_data,
)
from backend.auth.service import AuthService
from backend.config import Settings

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    refresh_days: int = 30,
) -> None:
    # Access token cookie: 15 минут
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=15 * 60,
        path="/",
    )
    # Refresh token cookie: 30 дней
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=refresh_days * 86400,
        path="/auth",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/auth")


@router.post("/telegram/widget", response_model=TokenResponse)
async def login_telegram_widget(
    payload: TelegramWidgetAuthRequest,
    request: Request,
    response: Response,
    service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    try:
        raw_dict = payload.model_dump()
        validated_data = validate_telegram_widget_data(
            raw_dict, bot_token=settings.telegram_bot_token
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Telegram validation failed: {err}",
        ) from err

    telegram_id = int(validated_data["id"])
    first_name = validated_data.get("first_name") or ""
    last_name = validated_data.get("last_name") or ""
    display_name = f"{first_name} {last_name}".strip() or None
    username = validated_data.get("username")
    photo_url = validated_data.get("photo_url")

    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    try:
        user, access_token, raw_refresh = await service.get_or_create_user(
            telegram_id=telegram_id,
            display_name=display_name,
            username=username,
            photo_url=photo_url,
            invite_token=payload.invite_token,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        ) from err

    _set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=raw_refresh,
        refresh_days=settings.refresh_token_expire_days,
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/telegram/webapp", response_model=TokenResponse)
async def login_telegram_webapp(
    payload: TelegramWebAppAuthRequest,
    request: Request,
    response: Response,
    service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    try:
        user_data = validate_telegram_webapp_init_data(
            payload.init_data, bot_token=settings.telegram_bot_token
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Telegram Mini App validation failed: {err}",
        ) from err

    telegram_id = int(user_data["id"])
    first_name = user_data.get("first_name") or ""
    last_name = user_data.get("last_name") or ""
    display_name = f"{first_name} {last_name}".strip() or None
    username = user_data.get("username")
    photo_url = user_data.get("photo_url")

    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    try:
        user, access_token, raw_refresh = await service.get_or_create_user(
            telegram_id=telegram_id,
            display_name=display_name,
            username=username,
            photo_url=photo_url,
            invite_token=payload.invite_token,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        ) from err

    _set_auth_cookies(
        response=response,
        access_token=access_token,
        refresh_token=raw_refresh,
        refresh_days=settings.refresh_token_expire_days,
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: Request,
    response: Response,
    service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    refresh_token_cookie: Annotated[str | None, Cookie(alias="refresh_token")] = None,
    x_refresh_token: Annotated[str | None, Header(alias="x-refresh-token")] = None,
) -> TokenResponse:
    raw_refresh = refresh_token_cookie or x_refresh_token
    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    try:
        user, new_access, new_refresh = await service.rotate_refresh_token(
            raw_refresh_token=raw_refresh,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except PermissionError as err:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(err),
        ) from err

    _set_auth_cookies(
        response=response,
        access_token=new_access,
        refresh_token=new_refresh,
        refresh_days=settings.refresh_token_expire_days,
    )

    return TokenResponse(
        access_token=new_access,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(
    response: Response,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[AuthService, Depends(get_auth_service)],
    refresh_token_cookie: Annotated[str | None, Cookie(alias="refresh_token")] = None,
    x_refresh_token: Annotated[str | None, Header(alias="x-refresh-token")] = None,
) -> dict[str, str]:
    raw_refresh = refresh_token_cookie or x_refresh_token
    await service.logout_user(current_user, raw_refresh_token=raw_refresh)
    _clear_auth_cookies(response)
    return {"status": "logged_out"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/groups", response_model=GroupResponse)
async def create_group_self_service(
    payload: GroupCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> GroupResponse:
    try:
        group = await service.create_group_self_service(
            creator=current_user,
            name=payload.name,
            faculty=payload.faculty,
            university=payload.university,
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        ) from err

    return GroupResponse.model_validate(group)


@router.post("/invites/elder", response_model=InviteResponse)
async def create_elder_invite(
    payload: ElderInviteCreateRequest,
    current_user: RequireAdmin,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> InviteResponse:
    invite, raw_token = await service.create_invite(
        creator=current_user,
        role=RoleEnum.ELDER.value,
        group_name=payload.group_name,
        is_single_use=True,
    )
    invite_url = f"/invite/{raw_token}"
    resp = InviteResponse.model_validate(invite)
    resp.invite_url = invite_url
    resp.token = raw_token
    return resp


@router.post("/invites/student", response_model=InviteResponse)
async def create_student_invite(
    payload: StudentInviteCreateRequest,
    current_user: RequireElder,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> InviteResponse:
    if not current_user.group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Elder has no assigned group",
        )

    invite, raw_token = await service.create_invite(
        creator=current_user,
        role=RoleEnum.STUDENT.value,
        group_id=current_user.group_id,
        subgroup_number=payload.subgroup_number,
        is_single_use=False,
    )
    invite_url = f"/invite/{raw_token}"
    resp = InviteResponse.model_validate(invite)
    resp.invite_url = invite_url
    resp.token = raw_token
    return resp


@router.post("/invites/role", response_model=InviteResponse)
async def create_role_invite(
    payload: RoleInviteCreateRequest,
    current_user: RequireElder,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> InviteResponse:
    if not current_user.group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Elder has no assigned group",
        )

    invite, raw_token = await service.create_invite(
        creator=current_user,
        role=payload.role,
        group_id=current_user.group_id,
        is_single_use=False,
    )
    invite_url = f"/invite/{raw_token}"
    resp = InviteResponse.model_validate(invite)
    resp.invite_url = invite_url
    resp.token = raw_token
    return resp


@router.get("/invites", response_model=list[InviteResponse])
async def list_invites(
    current_user: RequireElder,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> list[InviteResponse]:
    stmt = select(InviteToken)
    if current_user.role != RoleEnum.ADMIN.value:
        stmt = stmt.where(InviteToken.group_id == current_user.group_id)

    stmt = stmt.order_by(InviteToken.created_at.desc())
    result = await service.session.execute(stmt)
    invites = result.scalars().all()

    items = []
    for inv in invites:
        item = InviteResponse.model_validate(inv)
        item.invite_url = f"/invite/{inv.id}"
        items.append(item)
    return items


@router.delete("/invites/{invite_id}")
async def revoke_invite(
    invite_id: uuid.UUID,
    current_user: RequireElder,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> dict[str, str]:
    try:
        await service.revoke_invite(user=current_user, invite_id=invite_id)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(err),
        ) from err
    except PermissionError as err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(err),
        ) from err

    return {"status": "revoked"}
