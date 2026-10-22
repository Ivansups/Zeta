import pytest
from config import load_settings


def test_load_settings_requires_bot_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BOT_TOKEN", raising=False)
    monkeypatch.setenv("BACKEND_URL", "http://localhost:8000")
    with pytest.raises(ValueError):
        load_settings()


def test_load_settings_requires_backend_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOT_TOKEN", "123:abc")
    monkeypatch.delenv("BACKEND_URL", raising=False)
    with pytest.raises(ValueError):
        load_settings()


def test_load_settings_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOT_TOKEN", "123:abc")
    monkeypatch.setenv("BACKEND_URL", "http://localhost:8000")
    s = load_settings()
    assert s.bot_token == "123:abc"  # noqa: S105
    assert s.backend_url == "http://localhost:8000"
