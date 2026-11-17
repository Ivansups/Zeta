"""Simple per-user rate limiting for student questions."""

import time
from collections.abc import Callable


class QuestionThrottle:
    """Allow one question per user within the configured interval."""

    def __init__(
        self,
        interval: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        """Store the throttling interval and injectable clock."""
        self._interval = interval
        self._clock = clock
        self._last_request: dict[int, float] = {}

    def allow(self, user_id: int) -> bool:
        """Return True when the user may ask a new question now."""
        now = self._clock()
        last = self._last_request.get(user_id)
        if last is not None and now - last < self._interval:
            return False
        self._last_request[user_id] = now
        return True
