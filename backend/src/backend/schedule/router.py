"""HTTP API for importing and querying schedule timetables."""

import asyncio
import uuid
from io import BytesIO
from typing import Annotated

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.dependencies import RequireAdmin
from backend.db.session import get_session
from backend.schedule.db_models import SchedulePair
from backend.schedule.dependencies import get_llm_fallback_service
from backend.schedule.excel_parser import ScheduleExcelParser, ScheduleStructureError
from backend.schedule.llm_fallback import LLMFallbackService
from backend.schedule.models import ScheduleParseResult
from backend.schedule.schemas import ScheduleImportResponse, SchedulePairRead
from backend.schedule.service import ScheduleStorageService

router = APIRouter(prefix="/schedule", tags=["schedule"])


def _map_pair_to_read(pair: SchedulePair) -> SchedulePairRead:
    notes_list: list[str] = []
    if pair.notes:
        notes_list = [n.strip() for n in pair.notes.split(",") if n.strip()]
    group_name = pair.group.name if pair.group else None
    return SchedulePairRead(
        id=pair.id,
        group_id=pair.group_id,
        group_name=group_name,
        subgroup=pair.subgroup,
        day_of_week=pair.day_of_week,
        pair_number=pair.pair_number,
        start_time=pair.start_time,
        end_time=pair.end_time,
        week_parity=pair.week_parity,
        subject=pair.subject,
        subject_id=pair.subject_id,
        teacher=pair.teacher,
        teacher_title=pair.teacher_title,
        room=pair.room,
        is_online=pair.is_online,
        lesson_type=pair.lesson_type,
        notes=notes_list,
    )


@router.post("/parse", response_model=ScheduleParseResult)
async def parse_schedule_workbook(
    _: RequireAdmin,
    file: Annotated[UploadFile, File(description="Excel timetable (.xlsx)")],
    llm_service: Annotated[LLMFallbackService, Depends(get_llm_fallback_service)],
) -> ScheduleParseResult:
    """Parse an uploaded timetable and return extracted lessons without saving."""
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .xlsx files are supported",
        )

    content = await file.read()
    try:
        workbook = await asyncio.to_thread(
            openpyxl.load_workbook, BytesIO(content), data_only=True
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Cannot read the uploaded workbook",
        ) from err

    parser = ScheduleExcelParser(llm_service=llm_service)
    try:
        return await parser.parse_workbook(workbook)
    except ScheduleStructureError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(err),
        ) from err


@router.post("/import", response_model=ScheduleImportResponse)
async def import_schedule_workbook(
    _: RequireAdmin,
    file: Annotated[UploadFile, File(description="Excel timetable (.xlsx)")],
    llm_service: Annotated[LLMFallbackService, Depends(get_llm_fallback_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ScheduleImportResponse:
    """Parse Excel timetable and transactionally save all lessons into database."""
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .xlsx files are supported",
        )

    content = await file.read()
    try:
        workbook = await asyncio.to_thread(
            openpyxl.load_workbook, BytesIO(content), data_only=True
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Cannot read the uploaded workbook",
        ) from err

    parser = ScheduleExcelParser(llm_service=llm_service)
    try:
        parse_result = await parser.parse_workbook(workbook)
    except ScheduleStructureError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(err),
        ) from err

    storage_service = ScheduleStorageService(session=session)
    stats = await storage_service.save_parsed_schedule(parse_result.lessons)

    return ScheduleImportResponse(
        status="ok",
        groups_processed=stats["groups_processed"],
        pairs_saved=stats["pairs_saved"],
        parse_stats={
            "total_cells": parse_result.total_cells_processed,
            "regex_parsed": parse_result.regex_parsed_count,
            "llm_parsed": parse_result.llm_parsed_count,
            "unresolved": parse_result.unresolved_count,
        },
    )


@router.get("/day", response_model=list[SchedulePairRead])
async def get_day_schedule(
    session: Annotated[AsyncSession, Depends(get_session)],
    day: Annotated[str, Query(description="Day of week (e.g. 'Понедельник')")],
    group_id: Annotated[uuid.UUID | None, Query(description="Group ID")] = None,
    group_name: Annotated[str | None, Query(description="Group name")] = None,
    subgroup: Annotated[int | None, Query(description="Subgroup (1 or 2)")] = None,
    parity: Annotated[str | None, Query(description="Week parity")] = None,
) -> list[SchedulePairRead]:
    """Retrieve schedule pairs for a single day with subgroup filtering."""
    if not group_id and not group_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either group_id or group_name must be provided",
        )

    storage_service = ScheduleStorageService(session=session)
    pairs = await storage_service.get_day_schedule(
        group_id=group_id,
        group_name=group_name,
        day_of_week=day,
        subgroup=subgroup,
        week_parity=parity,
    )
    return [_map_pair_to_read(p) for p in pairs]


@router.get("/week", response_model=list[SchedulePairRead])
async def get_week_schedule(
    session: Annotated[AsyncSession, Depends(get_session)],
    group_id: Annotated[uuid.UUID | None, Query(description="Group ID")] = None,
    group_name: Annotated[str | None, Query(description="Group name")] = None,
    subgroup: Annotated[int | None, Query(description="Subgroup (1 or 2)")] = None,
    parity: Annotated[str | None, Query(description="Week parity filter")] = None,
) -> list[SchedulePairRead]:
    """Retrieve full weekly schedule grid for a group with subgroup filtering."""
    if not group_id and not group_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either group_id or group_name must be provided",
        )

    storage_service = ScheduleStorageService(session=session)
    pairs = await storage_service.get_week_schedule(
        group_id=group_id,
        group_name=group_name,
        subgroup=subgroup,
        week_parity=parity,
    )
    return [_map_pair_to_read(p) for p in pairs]
