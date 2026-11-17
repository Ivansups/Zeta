from telegram_bot.throttle import QuestionThrottle


class FakeClock:
    def __init__(self) -> None:
        self.now = 100.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def test_throttle_allows_first_request() -> None:
    clock = FakeClock()
    throttle = QuestionThrottle(interval=5.0, clock=clock)

    assert throttle.allow(42) is True


def test_throttle_blocks_repeated_request_within_interval() -> None:
    clock = FakeClock()
    throttle = QuestionThrottle(interval=5.0, clock=clock)

    assert throttle.allow(42) is True
    clock.advance(4.9)
    assert throttle.allow(42) is False


def test_throttle_allows_request_after_interval() -> None:
    clock = FakeClock()
    throttle = QuestionThrottle(interval=5.0, clock=clock)

    assert throttle.allow(42) is True
    clock.advance(5.0)
    assert throttle.allow(42) is True


def test_throttle_is_per_user() -> None:
    clock = FakeClock()
    throttle = QuestionThrottle(interval=5.0, clock=clock)

    assert throttle.allow(42) is True
    assert throttle.allow(7) is True
