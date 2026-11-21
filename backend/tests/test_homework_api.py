"""Integration tests for homework HTTP API endpoints."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.models import Group, RoleEnum, User
from backend.auth.security import create_access_token
from backend.config import Settings
from backend.homework.models import Homework, HomeworkDraft
from backend.schedule.db_models import SchedulePair


def _now() -> datetime:
    return datetime.now(UTC)


async def _create_group(db_session: AsyncSession, name: str) -> Group:
    group = Group(name=name, faculty="ФКН", university="ВГУ")
    db_session.add(group)
    await db_session.flush()
    return group


async def _create_user(
    db_session: AsyncSession,
    *,
    telegram_id: int,
    role: str,
    group_id: uuid.UUID | None = None,
    subgroup_number: int | None = None,
) -> User:
    user = User(
        telegram_id=telegram_id,
        role=role,
        group_id=group_id,
        subgroup_number=subgroup_number,
        token_version=1,
    )
    db_session.add(user)
    await db_session.flush()
    return user


def _auth_header(user: User, settings: Settings) -> dict[str, str]:
    token = create_access_token(
        subject=str(user.id),
        role=user.role,
        token_version=user.token_version,
        secret_key=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}


async def _create_pair(
    db_session: AsyncSession,
    group_id: uuid.UUID,
    subject: str = "Высшая математика",
    subgroup: int | None = None,
) -> SchedulePair:
    pair = SchedulePair(
        group_id=group_id,
        subgroup=subgroup,
        day_of_week="Понедельник",
        pair_number=1,
        start_time="08:00",
        end_time="09:35",
        subject=subject,
    )
    db_session.add(pair)
    await db_session.flush()
    return pair


# =========================================================================
# 1. CREATE HOMEWORK (POST /homework)
# =========================================================================


@pytest.mark.asyncio
async def test_elder_create_homework_success(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group = await _create_group(db_session, "CS-101")
    elder = await _create_user(
        db_session, telegram_id=1001, role=RoleEnum.ELDER.value, group_id=group.id
    )

    deadline = (_now() + timedelta(days=3)).isoformat()
    resp = await client.post(
        "/homework",
        headers=_auth_header(elder, test_settings),
        json={
            "title": "Домашнее задание 1",
            "description": "Решить задачи 1-5 на стр. 42",
            "subject": "Математический анализ",
            "deadline": deadline,
            "subgroup": 1,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Домашнее задание 1"
    assert data["description"] == "Решить задачи 1-5 на стр. 42"
    assert data["subject"] == "Математический анализ"
    assert data["subgroup"] == 1
    assert data["group_id"] == str(group.id)
    assert data["created_by_id"] == str(elder.id)


@pytest.mark.asyncio
async def test_helper_create_homework_success(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group = await _create_group(db_session, "CS-102")
    helper = await _create_user(
        db_session, telegram_id=1002, role=RoleEnum.HELPER.value, group_id=group.id
    )

    deadline = (_now() + timedelta(days=4)).isoformat()
    resp = await client.post(
        "/homework",
        headers=_auth_header(helper, test_settings),
        json={
            "title": "Лабораторная по ОС",
            "description": "Сделать форки процессов",
            "deadline": deadline,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Лабораторная по ОС"
    assert data["group_id"] == str(group.id)


@pytest.mark.asyncio
async def test_admin_create_homework_for_any_group(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group = await _create_group(db_session, "CS-103")
    admin = await _create_user(db_session, telegram_id=9999, role=RoleEnum.ADMIN.value)

    deadline = (_now() + timedelta(days=5)).isoformat()
    resp = await client.post(
        "/homework",
        headers=_auth_header(admin, test_settings),
        json={
            "title": "Админское задание",
            "description": "Пройти анкетирование",
            "deadline": deadline,
            "group_id": str(group.id),
        },
    )
    assert resp.status_code == 201
    assert resp.json()["group_id"] == str(group.id)


@pytest.mark.asyncio
async def test_student_and_curator_cannot_create_homework(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group = await _create_group(db_session, "CS-104")
    student = await _create_user(
        db_session, telegram_id=2001, role=RoleEnum.STUDENT.value, group_id=group.id
    )
    curator = await _create_user(
        db_session, telegram_id=2002, role=RoleEnum.CURATOR.value, group_id=group.id
    )

    payload = {
        "title": "Задание",
        "description": "Тест",
        "deadline": (_now() + timedelta(days=2)).isoformat(),
    }

    # Student forbidden
    resp_student = await client.post(
        "/homework",
        headers=_auth_header(student, test_settings),
        json=payload,
    )
    assert resp_student.status_code == 403

    # Curator forbidden
    resp_curator = await client.post(
        "/homework",
        headers=_auth_header(curator, test_settings),
        json=payload,
    )
    assert resp_curator.status_code == 403


@pytest.mark.asyncio
async def test_elder_cannot_create_homework_for_other_group(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group_a = await _create_group(db_session, "CS-105-A")
    group_b = await _create_group(db_session, "CS-105-B")
    elder_a = await _create_user(
        db_session, telegram_id=3001, role=RoleEnum.ELDER.value, group_id=group_a.id
    )

    resp = await client.post(
        "/homework",
        headers=_auth_header(elder_a, test_settings),
        json={
            "title": "Вторжение",
            "description": "Тест",
            "deadline": (_now() + timedelta(days=2)).isoformat(),
            "group_id": str(group_b.id),
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_homework_with_schedule_pair(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group_a = await _create_group(db_session, "CS-106-A")
    group_b = await _create_group(db_session, "CS-106-B")
    elder = await _create_user(
        db_session, telegram_id=4001, role=RoleEnum.ELDER.value, group_id=group_a.id
    )
    pair_a = await _create_pair(db_session, group_id=group_a.id, subject="Алгебра")
    pair_b = await _create_pair(db_session, group_id=group_b.id, subject="Физика")

    deadline = (_now() + timedelta(days=2)).isoformat()

    # Success: pair belongs to group_a
    resp_ok = await client.post(
        "/homework",
        headers=_auth_header(elder, test_settings),
        json={
            "title": "Задание по алгебре",
            "description": "Стр 15",
            "deadline": deadline,
            "schedule_pair_id": str(pair_a.id),
        },
    )
    assert resp_ok.status_code == 201
    assert resp_ok.json()["schedule_pair_id"] == str(pair_a.id)

    # Error 400: pair belongs to another group
    resp_foreign = await client.post(
        "/homework",
        headers=_auth_header(elder, test_settings),
        json={
            "title": "Задание по физике",
            "description": "Стр 20",
            "deadline": deadline,
            "schedule_pair_id": str(pair_b.id),
        },
    )
    assert resp_foreign.status_code == 400

    # Error 404: nonexistent pair
    resp_none = await client.post(
        "/homework",
        headers=_auth_header(elder, test_settings),
        json={
            "title": "Задание несуществующее",
            "description": "Стр 99",
            "deadline": deadline,
            "schedule_pair_id": str(uuid.uuid4()),
        },
    )
    assert resp_none.status_code == 404


# =========================================================================
# 2. LIST HOMEWORKS (GET /homework)
# =========================================================================


@pytest.mark.asyncio
async def test_list_homeworks_subgroup_and_date_filtering(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group = await _create_group(db_session, "CS-201")
    elder = await _create_user(
        db_session, telegram_id=5001, role=RoleEnum.ELDER.value, group_id=group.id
    )
    student1 = await _create_user(
        db_session,
        telegram_id=5002,
        role=RoleEnum.STUDENT.value,
        group_id=group.id,
        subgroup_number=1,
    )
    curator = await _create_user(
        db_session,
        telegram_id=5003,
        role=RoleEnum.CURATOR.value,
        group_id=group.id,
    )

    base = _now()
    # HW1: All subgroups, due in 2 days
    hw1 = Homework(
        group_id=group.id,
        title="Общее ДЗ",
        description="Для всех",
        subgroup=None,
        deadline=base + timedelta(days=2),
    )
    # HW2: Subgroup 1, due in 4 days
    hw2 = Homework(
        group_id=group.id,
        title="ДЗ подгруппы 1",
        description="Только 1",
        subgroup=1,
        deadline=base + timedelta(days=4),
    )
    # HW3: Subgroup 2, due in 6 days
    hw3 = Homework(
        group_id=group.id,
        title="ДЗ подгруппы 2",
        description="Только 2",
        subgroup=2,
        deadline=base + timedelta(days=6),
    )
    db_session.add_all([hw1, hw2, hw3])
    await db_session.flush()

    # 1. Elder sees all 3
    resp_elder = await client.get(
        "/homework", headers=_auth_header(elder, test_settings)
    )
    assert resp_elder.status_code == 200
    assert len(resp_elder.json()) == 3

    # 2. Student 1 without subgroup param defaults to subgroup 1 (sees hw1 and hw2)
    resp_s1 = await client.get(
        "/homework", headers=_auth_header(student1, test_settings)
    )
    assert resp_s1.status_code == 200
    titles_s1 = [item["title"] for item in resp_s1.json()]
    assert "Общее ДЗ" in titles_s1
    assert "ДЗ подгруппы 1" in titles_s1
    assert "ДЗ подгруппы 2" not in titles_s1

    # 3. Student 1 explicitly requests subgroup 2 (sees hw1 and hw3)
    resp_s1_sub2 = await client.get(
        "/homework",
        params={"subgroup": 2},
        headers=_auth_header(student1, test_settings),
    )
    assert resp_s1_sub2.status_code == 200
    titles_sub2 = [item["title"] for item in resp_s1_sub2.json()]
    assert "Общее ДЗ" in titles_sub2
    assert "ДЗ подгруппы 2" in titles_sub2
    assert "ДЗ подгруппы 1" not in titles_sub2

    # 4. Curator sees all 3
    resp_curator = await client.get(
        "/homework", headers=_auth_header(curator, test_settings)
    )
    assert resp_curator.status_code == 200
    assert len(resp_curator.json()) == 3

    # 5. Date filtering
    d_from = (base + timedelta(days=3)).isoformat()
    d_to = (base + timedelta(days=5)).isoformat()
    resp_date = await client.get(
        "/homework",
        params={"date_from": d_from, "date_to": d_to},
        headers=_auth_header(elder, test_settings),
    )
    assert resp_date.status_code == 200
    date_items = resp_date.json()
    assert len(date_items) == 1
    assert date_items[0]["title"] == "ДЗ подгруппы 1"


@pytest.mark.asyncio
async def test_list_homeworks_cross_group_access_denied(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group_a = await _create_group(db_session, "CS-301-A")
    group_b = await _create_group(db_session, "CS-301-B")
    student_a = await _create_user(
        db_session, telegram_id=6001, role=RoleEnum.STUDENT.value, group_id=group_a.id
    )

    resp = await client.get(
        "/homework",
        params={"group_id": str(group_b.id)},
        headers=_auth_header(student_a, test_settings),
    )
    assert resp.status_code == 403


# =========================================================================
# 3. GET SINGLE HOMEWORK (GET /homework/{id})
# =========================================================================


@pytest.mark.asyncio
async def test_get_single_homework(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group_a = await _create_group(db_session, "CS-401-A")
    group_b = await _create_group(db_session, "CS-401-B")
    elder_a = await _create_user(
        db_session, telegram_id=7001, role=RoleEnum.ELDER.value, group_id=group_a.id
    )
    student_b = await _create_user(
        db_session, telegram_id=7002, role=RoleEnum.STUDENT.value, group_id=group_b.id
    )
    admin = await _create_user(db_session, telegram_id=9998, role=RoleEnum.ADMIN.value)

    hw = Homework(
        group_id=group_a.id,
        title="Важное задание",
        description="Текст",
        deadline=_now() + timedelta(days=1),
    )
    db_session.add(hw)
    await db_session.flush()

    # Success: elder of group_a
    resp_ok = await client.get(
        f"/homework/{hw.id}", headers=_auth_header(elder_a, test_settings)
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["title"] == "Важное задание"

    # Forbidden: student of group_b
    resp_forbid = await client.get(
        f"/homework/{hw.id}", headers=_auth_header(student_b, test_settings)
    )
    assert resp_forbid.status_code == 403

    # Admin: can access any
    resp_admin = await client.get(
        f"/homework/{hw.id}", headers=_auth_header(admin, test_settings)
    )
    assert resp_admin.status_code == 200

    # 404: nonexistent id
    resp_404 = await client.get(
        f"/homework/{uuid.uuid4()}", headers=_auth_header(elder_a, test_settings)
    )
    assert resp_404.status_code == 404


# =========================================================================
# 4. UPDATE HOMEWORK (PATCH /homework/{id})
# =========================================================================


@pytest.mark.asyncio
async def test_update_homework_success_and_permissions(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group = await _create_group(db_session, "CS-501")
    elder = await _create_user(
        db_session, telegram_id=8001, role=RoleEnum.ELDER.value, group_id=group.id
    )
    helper = await _create_user(
        db_session, telegram_id=8002, role=RoleEnum.HELPER.value, group_id=group.id
    )
    student = await _create_user(
        db_session, telegram_id=8003, role=RoleEnum.STUDENT.value, group_id=group.id
    )

    hw = Homework(
        group_id=group.id,
        title="Исходный заголовок",
        description="Исходное описание",
        deadline=_now() + timedelta(days=2),
    )
    db_session.add(hw)
    await db_session.flush()

    # Student cannot update -> 403
    resp_student = await client.patch(
        f"/homework/{hw.id}",
        headers=_auth_header(student, test_settings),
        json={"title": "Попытка взлома"},
    )
    assert resp_student.status_code == 403

    # Elder updates title and description
    resp_elder = await client.patch(
        f"/homework/{hw.id}",
        headers=_auth_header(elder, test_settings),
        json={
            "title": "Обновленный заголовок",
            "description": "Обновленное описание",
            "subgroup": 2,
        },
    )
    assert resp_elder.status_code == 200
    data_elder = resp_elder.json()
    assert data_elder["title"] == "Обновленный заголовок"
    assert data_elder["description"] == "Обновленное описание"
    assert data_elder["subgroup"] == 2

    # Helper updates deadline
    new_dl = (_now() + timedelta(days=10)).isoformat()
    resp_helper = await client.patch(
        f"/homework/{hw.id}",
        headers=_auth_header(helper, test_settings),
        json={"deadline": new_dl},
    )
    assert resp_helper.status_code == 200


# =========================================================================
# 5. DELETE HOMEWORK (DELETE /homework/{id})
# =========================================================================


@pytest.mark.asyncio
async def test_delete_homework_lifecycle(
    client: AsyncClient, db_session: AsyncSession, test_settings: Settings
) -> None:
    group = await _create_group(db_session, "CS-601")
    elder = await _create_user(
        db_session, telegram_id=9001, role=RoleEnum.ELDER.value, group_id=group.id
    )
    student = await _create_user(
        db_session, telegram_id=9002, role=RoleEnum.STUDENT.value, group_id=group.id
    )

    hw = Homework(
        group_id=group.id,
        title="Для удаления",
        description="Текст",
        deadline=_now() + timedelta(days=1),
    )
    db_session.add(hw)
    await db_session.flush()

    # Student cannot delete -> 403
    resp_student = await client.delete(
        f"/homework/{hw.id}", headers=_auth_header(student, test_settings)
    )
    assert resp_student.status_code == 403

    # Elder deletes -> 204
    resp_del = await client.delete(
        f"/homework/{hw.id}", headers=_auth_header(elder, test_settings)
    )
    assert resp_del.status_code == 204

    # Subsequent GET returns 404
    resp_get = await client.get(
        f"/homework/{hw.id}", headers=_auth_header(elder, test_settings)
    )
    assert resp_get.status_code == 404


# =========================================================================
# 6. DRAFT LIFECYCLE (PARSE, CONFIRM, CANCEL)
# =========================================================================


@pytest.mark.asyncio
async def test_draft_lifecycle_integration(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    group_a = await _create_group(db_session, "CS-701-A")
    group_b = await _create_group(db_session, "CS-701-B")
    elder_a = await _create_user(
        db_session, telegram_id=9501, role=RoleEnum.ELDER.value, group_id=group_a.id
    )
    student_a = await _create_user(
        db_session, telegram_id=9502, role=RoleEnum.STUDENT.value, group_id=group_a.id
    )
    elder_b = await _create_user(
        db_session, telegram_id=9503, role=RoleEnum.ELDER.value, group_id=group_b.id
    )

    # 1. Parse draft via text
    parse_resp = await client.post(
        "/homework/parse-from-text",
        json={
            "telegram_id": elder_a.telegram_id,
            "text": "ДЗ по матану: номера 1-10 к пятнице для 1 подгруппы",
        },
    )
    assert parse_resp.status_code == 200
    draft_data = parse_resp.json()
    draft_id = draft_data["draft_id"]
    assert draft_data["subgroup"] == 1
    assert "Математический анализ" in draft_data["subject"]

    # 2. Student cannot cancel the draft -> 403
    cancel_student = await client.post(
        "/homework/cancel-draft",
        json={"telegram_id": student_a.telegram_id, "draft_id": draft_id},
    )
    assert cancel_student.status_code == 403

    # 3. Student cannot confirm the draft -> 403
    confirm_student = await client.post(
        "/homework/confirm-draft",
        json={"telegram_id": student_a.telegram_id, "draft_id": draft_id},
    )
    assert confirm_student.status_code == 403

    # 4. Elder B cannot confirm draft of group A -> 403
    confirm_foreign = await client.post(
        "/homework/confirm-draft",
        json={"telegram_id": elder_b.telegram_id, "draft_id": draft_id},
    )
    assert confirm_foreign.status_code == 403

    # 5. Elder A successfully confirms draft
    confirm_ok = await client.post(
        "/homework/confirm-draft",
        json={"telegram_id": elder_a.telegram_id, "draft_id": draft_id},
    )
    assert confirm_ok.status_code == 200
    hw_data = confirm_ok.json()
    assert "id" in hw_data
    assert hw_data["subgroup"] == 1

    # Verify draft is deleted and HW is in DB
    draft_in_db = await db_session.scalar(
        select(HomeworkDraft).where(HomeworkDraft.id == uuid.UUID(draft_id))
    )
    assert draft_in_db is None

    hw_in_db = await db_session.scalar(
        select(Homework).where(Homework.id == uuid.UUID(hw_data["id"]))
    )
    assert hw_in_db is not None
    assert hw_in_db.group_id == group_a.id


@pytest.mark.asyncio
async def test_draft_cancel_integration(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    group = await _create_group(db_session, "CS-702")
    elder = await _create_user(
        db_session, telegram_id=9601, role=RoleEnum.ELDER.value, group_id=group.id
    )

    # 1. Parse draft
    parse_resp = await client.post(
        "/homework/parse-from-text",
        json={
            "telegram_id": elder.telegram_id,
            "text": "ДЗ по питону: лаба 3",
        },
    )
    assert parse_resp.status_code == 200
    draft_id = parse_resp.json()["draft_id"]

    # 2. Cancel draft
    cancel_resp = await client.post(
        "/homework/cancel-draft",
        json={"telegram_id": elder.telegram_id, "draft_id": draft_id},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "ok"

    # Verify draft is deleted
    draft_in_db = await db_session.scalar(
        select(HomeworkDraft).where(HomeworkDraft.id == uuid.UUID(draft_id))
    )
    assert draft_in_db is None
