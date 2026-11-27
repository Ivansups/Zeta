"""Unit tests for personal tasks, crowdsourcing with moderation, and participants."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.auth.models import User
from backend.homework.models import Homework
from backend.homework.schemas import (
    HomeworkCreate,
    HomeworkModerateRequest,
)
from backend.homework.service import HomeworkService


def _user(
    role: str = "student",
    group_id: uuid.UUID | None = None,
    subgroup_number: int | None = 1,
) -> User:
    return User(
        id=uuid.uuid4(),
        telegram_id=12345678,
        role=role,
        group_id=group_id,
        subgroup_number=subgroup_number,
        token_version=1,
    )


@pytest.mark.asyncio
async def test_student_can_create_personal_task_without_group() -> None:
    """Student without a group can create personal tasks without deadline."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    service = HomeworkService(session=mock_session)
    student = _user(role="student", group_id=None)

    data = HomeworkCreate(
        title="Подготовиться к собеседованию",
        description="Повторить структуры данных и алгоритмы",
        deadline=None,
        is_personal=True,
    )

    hw = await service.create_homework(user=student, data=data)

    assert hw.is_personal is True
    assert hw.deadline is None
    assert hw.created_by_id == student.id
    assert hw.group_id is None
    assert hw.status == "approved"
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_student_suggests_personal_task_to_group() -> None:
    """Student proposes their personal task to the group for moderation."""
    mock_session = AsyncMock()
    service = HomeworkService(session=mock_session)

    group_id = uuid.uuid4()
    student = _user(role="student", group_id=group_id)

    hw = Homework(
        id=uuid.uuid4(),
        title="Лабораторная 3 по сетям",
        description="Сдать отчет по Wireshark",
        deadline=None,
        created_by_id=student.id,
        group_id=None,
        is_personal=True,
        status="approved",
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = hw
    mock_session.execute.return_value = mock_result

    suggested = await service.suggest_homework(user=student, homework_id=hw.id)

    assert suggested.status == "pending_approval"
    assert suggested.group_id == group_id
    assert suggested.submitted_to_group_at is not None
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_student_recalls_suggested_task() -> None:
    """Student can recall their pending suggestion back to personal."""
    mock_session = AsyncMock()
    service = HomeworkService(session=mock_session)

    group_id = uuid.uuid4()
    student = _user(role="student", group_id=group_id)

    hw = Homework(
        id=uuid.uuid4(),
        title="Черновик ДЗ",
        description="Описание",
        created_by_id=student.id,
        group_id=group_id,
        is_personal=True,
        status="pending_approval",
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = hw
    mock_session.execute.return_value = mock_result

    recalled = await service.recall_homework(user=student, homework_id=hw.id)

    assert recalled.status == "recalled"
    assert recalled.is_personal is True
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_elder_moderates_and_approves_with_edits() -> None:
    """Elder approves proposed homework with inline adjustments."""
    mock_session = AsyncMock()
    service = HomeworkService(session=mock_session)

    group_id = uuid.uuid4()
    elder = _user(role="elder", group_id=group_id)
    student = _user(role="student", group_id=group_id)

    hw = Homework(
        id=uuid.uuid4(),
        title="Задачи по физике",
        description="Стр 45 №1-5",
        created_by_id=student.id,
        group_id=group_id,
        is_personal=True,
        status="pending_approval",
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = hw
    mock_session.execute.return_value = mock_result

    mod_request = HomeworkModerateRequest(
        action="approve",
        title="Физика: задачи по оптике",
        description="Стр 45 №1-5 к семинару",
        subgroup=1,
    )

    approved = await service.moderate_homework(
        user=elder, homework_id=hw.id, data=mod_request
    )

    assert approved.status == "approved"
    assert approved.is_personal is False
    assert approved.approved_by_id == elder.id
    assert approved.edited_by_id == elder.id
    assert approved.title == "Физика: задачи по оптике"
    assert approved.description == "Стр 45 №1-5 к семинару"
    assert approved.subgroup == 1
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_elder_rejects_with_comment() -> None:
    """Elder rejects task; it stays in personal list with moderation comment."""
    mock_session = AsyncMock()
    service = HomeworkService(session=mock_session)

    group_id = uuid.uuid4()
    elder = _user(role="elder", group_id=group_id)
    student = _user(role="student", group_id=group_id)

    hw = Homework(
        id=uuid.uuid4(),
        title="Неверное ДЗ",
        description="Задачи",
        created_by_id=student.id,
        group_id=group_id,
        is_personal=True,
        status="pending_approval",
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = hw
    mock_session.execute.return_value = mock_result

    mod_request = HomeworkModerateRequest(
        action="reject",
        moderation_comment="Преподаватель перенес задание на следующую неделю",
    )

    rejected = await service.moderate_homework(
        user=elder, homework_id=hw.id, data=mod_request
    )

    assert rejected.status == "rejected"
    assert rejected.is_personal is True
    assert (
        rejected.moderation_comment
        == "Преподаватель перенес задание на следующую неделю"
    )
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_toggle_personal_completion() -> None:
    """Student can mark/unmark a homework task as completed."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    service = HomeworkService(session=mock_session)

    group_id = uuid.uuid4()
    student = _user(role="student", group_id=group_id)
    hw_id = uuid.uuid4()

    # 1. Not completed yet -> mark completed
    mock_result1 = MagicMock()
    mock_result1.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result1

    res1 = await service.toggle_completion(user=student, homework_id=hw_id)
    assert res1.is_completed is True
    mock_session.add.assert_called_once()
