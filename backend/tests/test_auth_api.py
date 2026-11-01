import hashlib
import hmac
import time
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import RefreshToken
from backend.config import Settings


def make_widget_auth_data(
    telegram_id: int,
    bot_token: str,
    first_name: str = "Ivan",
    last_name: str = "Klimov",
    username: str = "ivansups",
    invite_token: str | None = None,
) -> dict[str, Any]:
    secret_key = hashlib.sha256(bot_token.encode("utf-8")).digest()
    auth_date = int(time.time())

    data: dict[str, Any] = {
        "id": telegram_id,
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "auth_date": auth_date,
    }

    lines = [f"{k}={v}" for k, v in sorted(data.items())]
    data_check_string = "\n".join(lines)
    expected_hash = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    data["hash"] = expected_hash
    if invite_token:
        data["invite_token"] = invite_token
    return data


def make_webapp_init_data(
    telegram_id: int,
    bot_token: str,
    username: str = "alex_b",
) -> str:
    secret_key = hmac.new(
        b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256
    ).digest()
    auth_date = int(time.time())
    user_json = f'{{"id":{telegram_id},"first_name":"Alex","username":"{username}"}}'

    params = {
        "auth_date": str(auth_date),
        "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
        "user": user_json,
    }
    lines = [f"{k}={v}" for k, v in sorted(params.items())]
    data_check_string = "\n".join(lines)
    expected_hash = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    return (
        f"auth_date={auth_date}"
        f"&hash={expected_hash}"
        "&query_id=AAHdF6IQAAAAAN0XohDhrOrc"
        f"&user={user_json}"
    )


async def test_telegram_widget_login_success(
    client: AsyncClient, test_settings: Settings
) -> None:
    data = make_widget_auth_data(
        telegram_id=1001, bot_token=test_settings.telegram_bot_token
    )
    resp = await client.post("/auth/telegram/widget", json=data)

    assert resp.status_code == 200
    res_json = resp.json()
    assert "access_token" in res_json
    assert res_json["user"]["telegram_id"] == 1001
    assert res_json["user"]["role"] == "student"

    # Проверяем установку cookies
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies


async def test_telegram_widget_login_invalid_hash(
    client: AsyncClient, test_settings: Settings
) -> None:
    data = make_widget_auth_data(
        telegram_id=1002, bot_token=test_settings.telegram_bot_token
    )
    data["hash"] = "fake-invalid-hash"
    resp = await client.post("/auth/telegram/widget", json=data)

    assert resp.status_code == 400
    assert "Telegram validation failed" in resp.json()["detail"]


async def test_telegram_webapp_login_success(
    client: AsyncClient, test_settings: Settings
) -> None:
    init_data = make_webapp_init_data(
        telegram_id=2002, bot_token=test_settings.telegram_bot_token
    )
    resp = await client.post("/auth/telegram/webapp", json={"init_data": init_data})

    assert resp.status_code == 200
    res_json = resp.json()
    assert res_json["user"]["telegram_id"] == 2002
    assert res_json["user"]["username"] == "alex_b"


async def test_get_me_authenticated(
    client: AsyncClient, test_settings: Settings
) -> None:
    data = make_widget_auth_data(
        telegram_id=3003, bot_token=test_settings.telegram_bot_token
    )
    login_resp = await client.post("/auth/telegram/widget", json=data)
    access_token = login_resp.json()["access_token"]

    # Доступ через заголовок Bearer
    me_resp = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["telegram_id"] == 3003

    # Неавторизованный запрос
    anon_resp = await client.get("/auth/me")
    assert anon_resp.status_code == 401


async def test_refresh_token_rotation_and_reuse_detection(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    # 1. Логинимся
    data = make_widget_auth_data(
        telegram_id=4004, bot_token=test_settings.telegram_bot_token
    )
    login_resp = await client.post("/auth/telegram/widget", json=data)
    first_refresh = login_resp.cookies["refresh_token"]

    # 2. Ротация токена: передаем refresh_token
    client.cookies.set("refresh_token", first_refresh)
    refresh_resp = await client.post("/auth/refresh")
    assert refresh_resp.status_code == 200
    second_refresh = refresh_resp.cookies["refresh_token"]
    second_access = refresh_resp.json()["access_token"]
    assert second_refresh != first_refresh

    # 3. REUSE DETECTION: атакующий пытается использовать первый токен повторно!
    client.cookies.set("refresh_token", first_refresh)
    compromised_resp = await client.post("/auth/refresh")
    assert compromised_resp.status_code == 401
    assert "Compromised token reuse detected" in compromised_resp.json()["detail"]

    # 4. Проверяем, что ВСЯ семья токенов отозвана в БД
    stmt = select(RefreshToken)
    tokens = (await db_session.execute(stmt)).scalars().all()
    assert len(tokens) >= 2
    for t in tokens:
        assert t.is_revoked is True

    # 5. Token_version инкрементирован, старый токен не работает
    client.cookies.clear()
    me_resp = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {second_access}"}
    )
    assert me_resp.status_code == 401
    assert "Token session has been invalidated" in me_resp.json()["detail"]


async def test_logout_invalidates_session(
    client: AsyncClient, test_settings: Settings
) -> None:
    data = make_widget_auth_data(
        telegram_id=5005, bot_token=test_settings.telegram_bot_token
    )
    login_resp = await client.post("/auth/telegram/widget", json=data)
    access_token = login_resp.json()["access_token"]
    refresh_token = login_resp.cookies["refresh_token"]

    # Logout
    client.cookies.set("refresh_token", refresh_token)
    logout_resp = await client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert logout_resp.status_code == 200

    # Проверяем, что старый токен больше не валиден
    client.cookies.clear()
    me_resp = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_resp.status_code == 401


async def test_self_service_group_creation(
    client: AsyncClient, test_settings: Settings
) -> None:
    data = make_widget_auth_data(
        telegram_id=6006, bot_token=test_settings.telegram_bot_token
    )
    login_resp = await client.post("/auth/telegram/widget", json=data)
    access_token = login_resp.json()["access_token"]

    # Создание группы пользователем
    group_resp = await client.post(
        "/auth/groups",
        json={"name": "IU5-11B", "faculty": "FKN", "university": "BMSTU"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert group_resp.status_code == 200
    group_data = group_resp.json()
    assert group_data["name"] == "IU5-11B"

    # Рефрешим сессию, чтобы получить обновленный access_token с ролью elder
    refresh_token = login_resp.cookies["refresh_token"]
    client.cookies.set("refresh_token", refresh_token)
    ref_resp = await client.post("/auth/refresh")
    assert ref_resp.json()["user"]["role"] == "elder"
    assert ref_resp.json()["user"]["group_id"] == group_data["id"]


async def test_invites_flow_student_helper_curator(
    client: AsyncClient, test_settings: Settings
) -> None:
    # 1. Создаем старосту и группу
    elder_data = make_widget_auth_data(
        telegram_id=7001, bot_token=test_settings.telegram_bot_token
    )
    elder_login = await client.post("/auth/telegram/widget", json=elder_data)
    elder_access = elder_login.json()["access_token"]

    await client.post(
        "/auth/groups",
        json={"name": "IU5-21B"},
        headers={"Authorization": f"Bearer {elder_access}"},
    )

    # Рефрешим старосту
    client.cookies.set("refresh_token", elder_login.cookies["refresh_token"])
    elder_ref = await client.post("/auth/refresh")
    elder_access = elder_ref.json()["access_token"]

    # 2. Староста создает инвайт для подгруппы 1
    stu_inv_resp = await client.post(
        "/auth/invites/student",
        json={"subgroup_number": 1},
        headers={"Authorization": f"Bearer {elder_access}"},
    )
    assert stu_inv_resp.status_code == 200
    student_token = stu_inv_resp.json()["token"]

    # 3. Студент регистрируется по инвайту подгруппы 1
    student_data = make_widget_auth_data(
        telegram_id=7002,
        bot_token=test_settings.telegram_bot_token,
        invite_token=student_token,
    )
    stu_login = await client.post("/auth/telegram/widget", json=student_data)
    assert stu_login.status_code == 200
    stu_user = stu_login.json()["user"]
    assert stu_user["role"] == "student"
    assert stu_user["subgroup_number"] == 1
    assert stu_user["group_id"] == elder_ref.json()["user"]["group_id"]

    # 4. Староста создает инвайт для куратора
    cur_inv_resp = await client.post(
        "/auth/invites/role",
        json={"role": "curator"},
        headers={"Authorization": f"Bearer {elder_access}"},
    )
    assert cur_inv_resp.status_code == 200
    curator_token = cur_inv_resp.json()["token"]

    # 5. Куратор входит по инвайту
    curator_data = make_widget_auth_data(
        telegram_id=7003,
        bot_token=test_settings.telegram_bot_token,
        invite_token=curator_token,
    )
    cur_login = await client.post("/auth/telegram/widget", json=curator_data)
    assert cur_login.status_code == 200
    cur_user = cur_login.json()["user"]
    assert cur_user["role"] == "curator"
    assert cur_user["group_id"] == elder_ref.json()["user"]["group_id"]

    # 6. Староста создает инвайт для помощника (helper)
    hlp_inv_resp = await client.post(
        "/auth/invites/role",
        json={"role": "helper"},
        headers={"Authorization": f"Bearer {elder_access}"},
    )
    helper_token = hlp_inv_resp.json()["token"]
    invite_id = hlp_inv_resp.json()["id"]

    # 7. Староста отзывает инвайт помощника
    del_resp = await client.delete(
        f"/auth/invites/{invite_id}",
        headers={"Authorization": f"Bearer {elder_access}"},
    )
    assert del_resp.status_code == 200

    # 8. Попытка войти по отозванному инвайту дает 400
    helper_data = make_widget_auth_data(
        telegram_id=7004,
        bot_token=test_settings.telegram_bot_token,
        invite_token=helper_token,
    )
    failed_login = await client.post("/auth/telegram/widget", json=helper_data)
    assert failed_login.status_code == 400
    assert "revoked" in failed_login.json()["detail"]
