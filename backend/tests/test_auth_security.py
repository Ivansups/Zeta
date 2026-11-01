import hashlib
import hmac
import time
from typing import Any

import pytest

from backend.auth.security import (
    create_access_token,
    decode_access_token,
    generate_random_token,
    hash_token,
    validate_telegram_webapp_init_data,
    validate_telegram_widget_data,
)

BOT_TOKEN = "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ_TestingToken32Chars"
JWT_SECRET = "supersecretjwtkeythatisatleast32byteslongforsecurity!"


def make_valid_widget_data(
    telegram_id: int = 123456789,
    first_name: str = "Ivan",
    auth_date: int | None = None,
    bot_token: str = BOT_TOKEN,
) -> dict[str, Any]:
    if auth_date is None:
        auth_date = int(time.time())
    data: dict[str, Any] = {
        "id": telegram_id,
        "first_name": first_name,
        "auth_date": auth_date,
    }
    check_items = [f"{k}={v}" for k, v in sorted(data.items())]
    check_string = "\n".join(check_items)
    secret_key = hashlib.sha256(bot_token.encode("utf-8")).digest()
    expected_hash = hmac.new(
        secret_key, check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    data["hash"] = expected_hash
    return data


def make_valid_webapp_init_data(
    telegram_id: int = 123456789,
    auth_date: int | None = None,
    bot_token: str = BOT_TOKEN,
) -> str:
    if auth_date is None:
        auth_date = int(time.time())
    user_json = f'{{"id":{telegram_id},"first_name":"Ivan"}}'
    params = {
        "auth_date": str(auth_date),
        "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
        "user": user_json,
    }
    check_items = [f"{k}={v}" for k, v in sorted(params.items())]
    check_string = "\n".join(check_items)
    secret_key = hmac.new(
        b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256
    ).digest()
    expected_hash = hmac.new(
        secret_key, check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return (
        f"auth_date={auth_date}"
        f"&hash={expected_hash}"
        "&query_id=AAHdF6IQAAAAAN0XohDhrOrc"
        f"&user={user_json}"
    )


def test_hash_token() -> None:
    token = "sample_raw_token_value_123"
    expected = hashlib.sha256(token.encode("utf-8")).hexdigest()
    assert hash_token(token) == expected
    assert hash_token(token) != hash_token(token + "_different")


def test_generate_random_token() -> None:
    t1 = generate_random_token(32)
    t2 = generate_random_token(32)
    assert len(t1) >= 32
    assert t1 != t2


def test_validate_telegram_widget_data_success() -> None:
    data = make_valid_widget_data()
    validated = validate_telegram_widget_data(data, BOT_TOKEN)
    assert validated["id"] == 123456789
    assert validated["first_name"] == "Ivan"


def test_validate_telegram_widget_data_missing_or_bad_hash() -> None:
    data = make_valid_widget_data()
    data.pop("hash")
    with pytest.raises(ValueError, match="Missing or invalid Telegram widget hash"):
        validate_telegram_widget_data(data, BOT_TOKEN)

    data["hash"] = "invalid_hash_value"
    with pytest.raises(ValueError, match="Invalid Telegram widget signature"):
        validate_telegram_widget_data(data, BOT_TOKEN)


def test_validate_telegram_widget_data_missing_or_invalid_auth_date() -> None:
    data = make_valid_widget_data()
    data.pop("auth_date")
    data["hash"] = "somehash"
    with pytest.raises(ValueError, match="Missing auth_date"):
        validate_telegram_widget_data(data, BOT_TOKEN)

    data["auth_date"] = "not_a_number"
    with pytest.raises(ValueError, match="Invalid auth_date"):
        validate_telegram_widget_data(data, BOT_TOKEN)


def test_validate_telegram_widget_data_expired() -> None:
    expired_date = int(time.time()) - 100000
    data = make_valid_widget_data(auth_date=expired_date)
    with pytest.raises(ValueError, match="Telegram auth_date is expired"):
        validate_telegram_widget_data(data, BOT_TOKEN, max_age_seconds=86400)


def test_validate_telegram_widget_data_future() -> None:
    future_date = int(time.time()) + 1000
    data = make_valid_widget_data(auth_date=future_date)
    with pytest.raises(ValueError, match="Telegram auth_date is in the future"):
        validate_telegram_widget_data(data, BOT_TOKEN)


def test_validate_telegram_webapp_init_data_success() -> None:
    init_data = make_valid_webapp_init_data()
    user_data = validate_telegram_webapp_init_data(init_data, BOT_TOKEN)
    assert user_data["id"] == 123456789
    assert user_data["first_name"] == "Ivan"


def test_validate_telegram_webapp_init_data_missing_or_invalid_hash() -> None:
    with pytest.raises(ValueError, match="Missing hash"):
        validate_telegram_webapp_init_data("auth_date=123&user={}", BOT_TOKEN)

    init_data = make_valid_webapp_init_data()
    corrupted = init_data.replace("hash=", "hash=tampered")
    with pytest.raises(ValueError, match="Invalid Telegram Mini App signature"):
        validate_telegram_webapp_init_data(corrupted, BOT_TOKEN)


def test_validate_telegram_webapp_init_data_missing_or_bad_auth_date() -> None:
    with pytest.raises(ValueError, match="Missing auth_date"):
        validate_telegram_webapp_init_data("hash=abc&user={}", BOT_TOKEN)

    with pytest.raises(ValueError, match="Invalid auth_date"):
        validate_telegram_webapp_init_data("hash=abc&auth_date=abc&user={}", BOT_TOKEN)


def test_validate_telegram_webapp_init_data_expired() -> None:
    expired_date = int(time.time()) - 100000
    init_data = make_valid_webapp_init_data(auth_date=expired_date)
    with pytest.raises(ValueError, match="Telegram Mini App initData is expired"):
        validate_telegram_webapp_init_data(init_data, BOT_TOKEN, max_age_seconds=86400)


def test_validate_telegram_webapp_init_data_future() -> None:
    future_date = int(time.time()) + 1000
    init_data = make_valid_webapp_init_data(auth_date=future_date)
    with pytest.raises(ValueError, match="Telegram Mini App initData is in the future"):
        validate_telegram_webapp_init_data(init_data, BOT_TOKEN)


def test_validate_telegram_webapp_init_data_invalid_user_json() -> None:
    auth_date = int(time.time())
    params = {
        "auth_date": str(auth_date),
        "user": "{malformed_json",
    }
    check_items = [f"{k}={v}" for k, v in sorted(params.items())]
    check_string = "\n".join(check_items)
    secret_key = hmac.new(
        b"WebAppData", BOT_TOKEN.encode("utf-8"), hashlib.sha256
    ).digest()
    expected_hash = hmac.new(
        secret_key, check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    raw = f"auth_date={auth_date}&hash={expected_hash}&user={{malformed_json"
    with pytest.raises(ValueError, match="Invalid JSON"):
        validate_telegram_webapp_init_data(raw, BOT_TOKEN)


def test_create_and_decode_access_token() -> None:
    subject = "user-uuid-123"
    token = create_access_token(
        subject=subject,
        role="elder",
        token_version=2,
        secret_key=JWT_SECRET,
        expires_minutes=15,
    )
    payload = decode_access_token(token, JWT_SECRET)
    assert payload["sub"] == subject
    assert payload["role"] == "elder"
    assert payload["tv"] == 2
    assert "iat" in payload
    assert "exp" in payload


def test_decode_access_token_invalid_or_expired() -> None:
    expired_token = create_access_token(
        subject="user-123",
        role="student",
        token_version=1,
        secret_key=JWT_SECRET,
        expires_minutes=-5,
    )
    with pytest.raises(ValueError, match="Invalid access token"):
        decode_access_token(expired_token, JWT_SECRET)

    valid_token = create_access_token(
        subject="user-123",
        role="student",
        token_version=1,
        secret_key=JWT_SECRET,
        expires_minutes=15,
    )
    wrong_secret = "anothersecretkeythatisatleast32byteslongaswell!"
    with pytest.raises(ValueError, match="Invalid access token"):
        decode_access_token(valid_token, wrong_secret)
