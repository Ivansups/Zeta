"""Data models and schemas for the schedule parser."""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class WeekParity(StrEnum):
    """Week parity in university schedules."""

    NUMERATOR = "numerator"
    DENOMINATOR = "denominator"
    BOTH = "both"


class LessonType(StrEnum):
    """Types of academic lessons."""

    LECTURE = "lecture"
    PRACTICE = "practice"
    LAB = "lab"
    SEMINAR = "seminar"
    OTHER = "other"


class LessonCellExtraction(BaseModel):
    """Fields the LLM must extract from a single schedule cell.

    Also serves as the JSON schema sent to the model, so descriptions are
    instructions for the model rather than prompt text.
    """

    subject: str = Field(description="Название предмета", max_length=512)
    subject_id: str | None = Field(
        default=None, description="Числовой идентификатор предмета или null"
    )
    teacher: str | None = Field(default=None, description="ФИО преподавателя или null")
    teacher_title: str | None = Field(
        default=None,
        description="Должность: ст.преп./доц./проф./асс. или null",
    )
    room: str | None = Field(
        default=None, description="Номер аудитории, 'ДО' или 'ВУЦ'"
    )
    is_online: bool = Field(default=False, description="Признак дистанционного формата")
    lesson_type: LessonType = Field(
        default=LessonType.OTHER,
        description="Тип занятия: lecture, practice, lab, seminar или other",
    )
    notes: list[str] = Field(
        default_factory=list, description="Служебные пометки, например ['ДО', 'ВУЦ']"
    )


class LessonCellData(BaseModel):
    """Extracted data from a single schedule cell."""

    subject: str
    subject_id: str | None = None
    teacher: str | None = None
    teacher_title: str | None = None
    room: str | None = None
    is_online: bool = False
    lesson_type: LessonType = LessonType.OTHER
    notes: list[str] = Field(default_factory=list)
    parsed_by: Literal["regex", "llm"] = "regex"


class ParsedLesson(BaseModel):
    """Full structured lesson record associated with a group, time and room."""

    course: int
    direction: str
    program: str | None = None
    group: str
    subgroup: int | None = None
    day_of_week: str
    pair_number: int
    start_time: str
    end_time: str
    week_parity: WeekParity
    subject: str
    subject_id: str | None = None
    teacher: str | None = None
    teacher_title: str | None = None
    room: str | None = None
    is_online: bool = False
    lesson_type: LessonType = LessonType.OTHER
    notes: list[str] = Field(default_factory=list)
    parsed_by: Literal["regex", "llm"] = "regex"


class ScheduleParseResult(BaseModel):
    """Overall outcome of parsing a schedule file or sheet."""

    lessons: list[ParsedLesson] = Field(default_factory=list)
    total_cells_processed: int = 0
    regex_parsed_count: int = 0
    llm_parsed_count: int = 0
    unresolved_count: int = 0
