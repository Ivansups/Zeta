"""HTTP API for importing Excel timetables."""

import asyncio
from io import BytesIO
from typing import Annotated

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.auth.dependencies import RequireAdmin
from backend.schedule.dependencies import get_llm_fallback_service
from backend.schedule.excel_parser import ScheduleExcelParser, ScheduleStructureError
from backend.schedule.llm_fallback import LLMFallbackService
from backend.schedule.models import ScheduleParseResult

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.post("/parse", response_model=ScheduleParseResult)
async def parse_schedule_workbook(
    _: RequireAdmin,
    file: Annotated[UploadFile, File(description="Excel timetable (.xlsx)")],
    llm_service: Annotated[LLMFallbackService, Depends(get_llm_fallback_service)],
) -> ScheduleParseResult:
    """Parse an uploaded Excel timetable and return the extracted lessons."""
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
