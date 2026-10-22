from unittest.mock import AsyncMock, patch

import pytest
from aiogram.types import Message, User

from handlers.auth import auth_start_handler


@pytest.mark.asyncio
async def test_auth_start_sends_confirm_with_token_and_telegram_id(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOT_TOKEN", "123:abc")
    monkeypatch.setenv("BACKEND_URL", "http://localhost:8000")
    user = User(id=12345, is_bot=False, first_name="Test")
    message = AsyncMock(spec=Message)
    message.from_user = user
    message.text = "/start login_abc123"
    message.answer = AsyncMock()

    with patch("handlers.auth.aiohttp.ClientSession") as mock_session_cls:
        mock_session = AsyncMock()
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"ok": True})
        mock_session.__aenter__.return_value = mock_session
        mock_session.__aexit__.return_value = False
        mock_session.post = AsyncMock(return_value=mock_response)
        mock_response.__aenter__.return_value = mock_response
        mock_response.__aexit__.return_value = False
        mock_session_cls.return_value = mock_session

        await auth_start_handler(message)

        mock_session.post.assert_called_once()
        call_args = mock_session.post.call_args
        url = call_args.args[0]
        assert "/auth/telegram/confirm" in url
        json_data = call_args.kwargs.get("json") or call_args.args[1] if len(call_args.args) > 1 else call_args.kwargs.get("json")
        # check payload
        if "json" in call_args.kwargs:
            assert call_args.kwargs["json"] == {"token": "abc123", "telegram_id": 12345}
        else:
            # try to find json in args
            found = False
            for a in call_args.args:
                if isinstance(a, dict) and "token" in a:
                    assert a == {"token": "abc123", "telegram_id": 12345}
                    found = True
            assert found or call_args.kwargs.get("json") == {"token": "abc123", "telegram_id": 12345}
