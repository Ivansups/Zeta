"""Excel workbook parser for university schedules."""

import re
from typing import Any

from openpyxl.workbook import Workbook
from openpyxl.worksheet.worksheet import Worksheet

from backend.schedule.cell_parser import parse_lesson_cell
from backend.schedule.llm_fallback import LLMFallbackService
from backend.schedule.models import (
    LessonCellData,
    ParsedLesson,
    ScheduleParseResult,
    WeekParity,
)

TIME_REGEX = re.compile(r"(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})")
COURSE_REGEX = re.compile(r"(\d+)\s*курс", re.IGNORECASE)


def normalize_time(t_str: str) -> str:
    """Normalize H:MM into 0H:MM format."""
    parts = t_str.strip().split(":")
    if len(parts) == 2:
        return f"{int(parts[0]):02d}:{parts[1]}"
    return t_str.strip()


class ScheduleExcelParser:
    """Parses semester schedule from Excel worksheets into structured JSON."""

    def __init__(self, llm_service: LLMFallbackService | None = None) -> None:
        self.llm_service = llm_service

    def _resolve_merge_range(
        self, ws: Worksheet, row: int, col: int
    ) -> tuple[int, int, int, int] | None:
        """Find merged range (min_row, max_row, min_col, max_col) if cell is merged."""
        for rng in ws.merged_cells.ranges:
            if rng.min_row <= row <= rng.max_row and rng.min_col <= col <= rng.max_col:
                return (rng.min_row, rng.max_row, rng.min_col, rng.max_col)
        return None

    def _get_cell_value(self, ws: Worksheet, row: int, col: int) -> Any:
        """Get cell value, looking up top-left value if merged."""
        rng = self._resolve_merge_range(ws, row, col)
        if rng:
            min_r, _, min_c, _ = rng
            return ws.cell(row=min_r, column=min_c).value
        return ws.cell(row=row, column=col).value

    async def parse_workbook(self, wb: Workbook) -> ScheduleParseResult:
        """Parse all schedule sheets in workbook."""
        result = ScheduleParseResult()
        for sheet_name in wb.sheetnames:
            if "расписание" in sheet_name.lower():
                ws = wb[sheet_name]
                sheet_result = await self.parse_worksheet(ws)
                result.lessons.extend(sheet_result.lessons)
                result.total_cells_processed += sheet_result.total_cells_processed
                result.regex_parsed_count += sheet_result.regex_parsed_count
                result.llm_parsed_count += sheet_result.llm_parsed_count
                result.unresolved_count += sheet_result.unresolved_count
        return result

    async def parse_worksheet(self, ws: Worksheet) -> ScheduleParseResult:
        """Parse a single worksheet grid."""
        result = ScheduleParseResult()
        max_col = ws.max_column
        max_row = ws.max_row

        if max_row < 5 or max_col < 3:
            return result

        # 1. Parse header columns (Course, Group, Direction, Profile)
        column_meta: dict[int, dict[str, Any]] = {}
        for c in range(3, max_col + 1):
            course_val = str(self._get_cell_value(ws, 1, c) or "")
            group_val = str(self._get_cell_value(ws, 2, c) or "")
            direction_val = str(self._get_cell_value(ws, 3, c) or "")
            program_val = str(self._get_cell_value(ws, 4, c) or "")

            course_match = COURSE_REGEX.search(course_val)
            course_num = int(course_match.group(1)) if course_match else 1

            if group_val.strip():
                column_meta[c] = {
                    "course": course_num,
                    "group": group_val.strip(),
                    "direction": direction_val.strip(),
                    "program": program_val.strip() or None,
                }

        # 2. Walk rows
        current_day: str = ""
        current_pair_num: int = 1
        current_time_start: str = "08:00"
        current_time_end: str = "09:35"

        processed_ranges: set[tuple[int, int, int, int]] = set()

        r = 5
        while r <= max_row:
            day_val = self._get_cell_value(ws, r, 1)
            if day_val and str(day_val).strip():
                current_day = str(day_val).strip()

            time_val = self._get_cell_value(ws, r, 2)
            if time_val and str(time_val).strip():
                match = TIME_REGEX.search(str(time_val))
                if match:
                    current_time_start = normalize_time(match.group(1))
                    current_time_end = normalize_time(match.group(2))

            time_range = self._resolve_merge_range(ws, r, 2)
            pair_row_start = time_range[0] if time_range else r
            pair_row_end = time_range[1] if time_range else r + 1

            for c in sorted(column_meta.keys()):
                raw_val = ws.cell(row=r, column=c).value
                rng = self._resolve_merge_range(ws, r, c)
                if rng:
                    min_r, max_r, min_c, max_c = rng
                    if (r, c) != (min_r, min_c):
                        continue
                    range_key = rng
                    cell_text = str(raw_val or "").strip()
                else:
                    range_key = (r, r, c, c)
                    min_r, max_r, min_c, max_c = range_key
                    cell_text = str(raw_val or "").strip()

                if not cell_text or range_key in processed_ranges:
                    continue

                processed_ranges.add(range_key)
                result.total_cells_processed += 1

                if min_r == pair_row_start and max_r >= pair_row_end:
                    parity = WeekParity.BOTH
                elif r == pair_row_start:
                    parity = WeekParity.NUMERATOR
                else:
                    parity = WeekParity.DENOMINATOR

                cell_data: LessonCellData | None = parse_lesson_cell(cell_text)
                if cell_data:
                    result.regex_parsed_count += 1
                elif self.llm_service:
                    ctx = {
                        "day": current_day,
                        "time": f"{current_time_start}-{current_time_end}",
                        "group": column_meta[c]["group"],
                        "parity": parity.value,
                    }
                    cell_data = await self.llm_service.resolve(cell_text, ctx)
                    if cell_data:
                        result.llm_parsed_count += 1
                    else:
                        result.unresolved_count += 1
                else:
                    result.unresolved_count += 1

                if not cell_data:
                    continue

                for target_col in range(min_c, max_c + 1):
                    if target_col not in column_meta:
                        continue
                    meta = column_meta[target_col]
                    lesson = ParsedLesson(
                        course=meta["course"],
                        direction=meta["direction"],
                        program=meta["program"],
                        group=meta["group"],
                        subgroup=None,
                        day_of_week=current_day,
                        pair_number=current_pair_num,
                        start_time=current_time_start,
                        end_time=current_time_end,
                        week_parity=parity,
                        subject=cell_data.subject,
                        subject_id=cell_data.subject_id,
                        teacher=cell_data.teacher,
                        teacher_title=cell_data.teacher_title,
                        room=cell_data.room,
                        is_online=cell_data.is_online,
                        lesson_type=cell_data.lesson_type,
                        notes=cell_data.notes,
                        parsed_by=cell_data.parsed_by,
                    )
                    result.lessons.append(lesson)

            r += 1

        return result
