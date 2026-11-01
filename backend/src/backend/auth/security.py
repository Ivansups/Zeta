import hashlib
import hmac
import json
import secrets
import time
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import parse_qsl

import jwt


def hash_token(token: str) -> str:
    """Compute sha256 hexdigest of a raw token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_random_token(nbytes: int = 32) -> str:
    """Generate a cryptographically secure random urlsafe token."""
    return secrets.token_urlsafe(nbytes)


def validate_telegram_widget_data(
    data: dict[str, Any],
    bot_token: str,
    max_age_seconds: int = 86400,
) -> dict[str, Any]:
    """Validate data received from Telegram Login Widget according to official spec.

    secret_key = SHA256(bot_token)
    check_string = sorted key=value pairs joined by newline
    hmac_sha256(secret_key, check_string) == hash
    """
    received_hash = data.get("hash")
    if not received_hash or not isinstance(received_hash, str):
        raise ValueError("Missing or invalid Telegram widget hash")

    # Проверка auth_date
    auth_date = data.get("auth_date")
    if auth_date is None:
        raise ValueError("Missing auth_date in Telegram widget data")

    try:
        auth_timestamp = int(auth_date)
    except (ValueError, TypeError) as err:
        raise ValueError("Invalid auth_date format") from err

    current_timestamp = int(time.time())
    if current_timestamp - auth_timestamp > max_age_seconds:
        raise ValueError("Telegram auth_date is expired")
    if auth_timestamp > current_timestamp + 300:
        raise ValueError("Telegram auth_date is in the future")

    # Формируем data_check_string
    check_items = []
    for k, v in data.items():
        if k in ("hash", "invite_token") or v is None:
            continue
        check_items.append(f"{k}={v}")

    data_check_string = "\n".join(sorted(check_items))

    secret_key = hashlib.sha256(bot_token.encode("utf-8")).digest()
    expected_hash = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise ValueError("Invalid Telegram widget signature")

    return data


def validate_telegram_webapp_init_data(
    init_data_raw: str,
    bot_token: str,
    max_age_seconds: int = 86400,
) -> dict[str, Any]:
    """Validate Telegram Mini App initData according to official Telegram WebApp spec.

    secret_key = HMAC_SHA256("WebAppData", bot_token)
    check_string = sorted key=value pairs joined by newline
    hmac_sha256(secret_key, check_string) == hash
    """
    parsed_pairs = dict(parse_qsl(init_data_raw, keep_blank_values=True))
    received_hash = parsed_pairs.get("hash")
    if not received_hash:
        raise ValueError("Missing hash in Telegram Mini App initData")

    auth_date_str = parsed_pairs.get("auth_date")
    if not auth_date_str:
        raise ValueError("Missing auth_date in Telegram Mini App initData")

    try:
        auth_timestamp = int(auth_date_str)
    except ValueError as err:
        raise ValueError("Invalid auth_date in Telegram Mini App initData") from err

    current_timestamp = int(time.time())
    if current_timestamp - auth_timestamp > max_age_seconds:
        raise ValueError("Telegram Mini App initData is expired")
    if auth_timestamp > current_timestamp + 300:
        raise ValueError("Telegram Mini App initData is in the future")

    check_items = []
    for k, v in parsed_pairs.items():
        if k == "hash":
            continue
        check_items.append(f"{k}={v}")

    data_check_string = "\n".join(sorted(check_items))

    secret_key = hmac.new(
        b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256
    ).digest()
    expected_hash = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise ValueError("Invalid Telegram Mini App signature")

    user_raw = parsed_pairs.get("user")
    if not user_raw:
        raise ValueError("Missing user object in Telegram Mini App initData")

    try:
        user_data: dict[str, Any] = json.loads(user_raw)
    except json.JSONDecodeError as err:
        raise ValueError("Invalid JSON in initData user field") from err

    return user_data


def create_access_token(
    subject: str,
    role: str,
    token_version: int,
    secret_key: str,
    expires_minutes: int = 15,
    algorithm: str = "HS256",
) -> str:
    """Create short-lived JWT access token with user_id, role, and token_version."""
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=expires_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "tv": token_version,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, secret_key, algorithm=algorithm)


def decode_access_token(
    token: str,
    secret_key: str,
    algorithms: list[str] | None = None,
) -> dict[str, Any]:
    """Decode and verify JWT access token."""
    if algorithms is None:
        algorithms = ["HS256"]
    try:
        payload: dict[str, Any] = jwt.decode(token, secret_key, algorithms=algorithms)
        return payload
    except jwt.PyJWTError as err:
        raise ValueError(f"Invalid access token: {err}") from err
