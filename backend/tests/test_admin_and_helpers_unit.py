"""Unit tests for superadmin all-groups management and multi-group helpers (S-20)."""

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.auth.models import AuditLog, Group, GroupHelper, RoleEnum, User
from backend.auth.service import AuthService
from backend.homework.schemas import HomeworkCreate
from backend.homework.service import HomeworkService


def _now() -> datetime:
    return datetime.now(UTC)


def _user(
    role: str,
    group_id: uuid.UUID | None = None,
    subgroup: int | None = None,
) -> User:
    return User(
        id=uuid.uuid4(),
        telegram_id=12345,
        role=role,
        group_id=group_id,
        subgroup_number=subgroup,
        display_name="Тестовый пользователь",
        created_at=_now(),
        token_version=1,
    )


@pytest.mark.asyncio
async def test_admin_can_list_all_groups_summary() -> None:
    admin = _user(RoleEnum.ADMIN.value)
    group1 = Group(
        id=uuid.uuid4(),
        name="IU5-11B",
        faculty="ФИТ",
        university="МГТУ",
        created_at=_now(),
    )
    group2 = Group(
        id=uuid.uuid4(),
        name="IU5-12B",
        faculty="ФИТ",
        university="МГТУ",
        created_at=_now(),
    )

    elder1 = _user(RoleEnum.ELDER.value, group_id=group1.id)
    student1 = _user(RoleEnum.STUDENT.value, group_id=group1.id)
    helper1 = _user(RoleEnum.HELPER.value, group_id=group1.id)

    mock_session = AsyncMock()

    # groups query mock
    groups_result = MagicMock()
    groups_result.scalars.return_value.all.return_value = [group1, group2]

    # users query mock
    users_result = MagicMock()
    users_result.scalars.return_value.all.return_value = [elder1, student1, helper1]

    # helpers query mock
    helpers_result = MagicMock()
    helpers_result.scalars.return_value.all.return_value = []

    mock_session.execute.side_effect = [groups_result, users_result, helpers_result]

    service = AuthService(session=mock_session)
    summaries = await service.list_all_groups_summary(actor=admin)

    assert len(summaries) == 2
    assert summaries[0].name == "IU5-11B"
    assert summaries[0].elder is not None
    assert summaries[0].elder.id == elder1.id
    assert summaries[0].students_count == 3


@pytest.mark.asyncio
async def test_non_admin_cannot_list_all_groups_summary() -> None:
    elder = _user(RoleEnum.ELDER.value)
    mock_session = AsyncMock()
    service = AuthService(session=mock_session)

    with pytest.raises(PermissionError, match="Admin role required"):
        await service.list_all_groups_summary(actor=elder)


@pytest.mark.asyncio
async def test_admin_can_set_group_elder_and_logs_audit() -> None:
    admin = _user(RoleEnum.ADMIN.value)
    group_id = uuid.uuid4()

    old_elder = _user(RoleEnum.ELDER.value, group_id=group_id)
    new_elder = _user(RoleEnum.STUDENT.value, group_id=group_id)

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    target_result = MagicMock()
    target_result.scalar_one_or_none.return_value = new_elder

    old_elders_result = MagicMock()
    old_elders_result.scalars.return_value.all.return_value = [old_elder]

    mock_session.execute.side_effect = [target_result, old_elders_result]

    service = AuthService(session=mock_session)
    updated = await service.set_group_elder(
        actor=admin, group_id=group_id, user_id=new_elder.id
    )

    assert updated.role == RoleEnum.ELDER.value
    assert old_elder.role == RoleEnum.STUDENT.value
    assert mock_session.add.call_count >= 1
    # Check that audit log was added
    audit_logs = [
        call.args[0]
        for call in mock_session.add.call_args_list
        if isinstance(call.args[0], AuditLog)
    ]
    assert any(log.event == "ADMIN_SET_ELDER" for log in audit_logs)
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_elder_can_add_and_remove_cross_group_helper() -> None:
    group_a_id = uuid.uuid4()
    group_b_id = uuid.uuid4()

    elder_a = _user(RoleEnum.ELDER.value, group_id=group_a_id)
    student_b = _user(RoleEnum.STUDENT.value, group_id=group_b_id)

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.delete = MagicMock()

    # User lookup mock
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = student_b

    # Existing helper lookup mock (not found)
    existing_res = MagicMock()
    existing_res.scalar_one_or_none.return_value = None

    mock_session.execute.side_effect = [user_res, existing_res]

    service = AuthService(session=mock_session)
    helper_link = await service.add_group_helper(
        actor=elder_a, group_id=group_a_id, user_id=student_b.id
    )

    assert helper_link.group_id == group_a_id
    assert helper_link.user_id == student_b.id

    # Audit check
    audit_logs = [
        call.args[0]
        for call in mock_session.add.call_args_list
        if isinstance(call.args[0], AuditLog)
    ]
    assert any(log.event == "HELPER_ADD" for log in audit_logs)


@pytest.mark.asyncio
async def test_cross_group_helper_can_manage_homework_in_linked_group() -> None:
    group_a_id = uuid.uuid4()
    group_b_id = uuid.uuid4()

    # User belongs primarily to group B, but is a helper in group A
    cross_helper = _user(RoleEnum.HELPER.value, group_id=group_b_id)

    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    # Mock DB query in HomeworkService checking GroupHelper link
    helper_link = GroupHelper(
        id=uuid.uuid4(), group_id=group_a_id, user_id=cross_helper.id
    )
    link_res = MagicMock()
    link_res.scalar_one_or_none.return_value = helper_link
    mock_session.execute.return_value = link_res

    service = HomeworkService(session=mock_session)
    data = HomeworkCreate(
        title="ДЗ от хелпера потока",
        description="Сдать отчет",
        deadline=_now() + timedelta(days=5),
        group_id=group_a_id,
    )

    hw = await service.create_homework(user=cross_helper, data=data)
    assert hw.group_id == group_a_id
    assert hw.title == "ДЗ от хелпера потока"
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()
