# Фикстуры расписания

Синтетические данные для тестов модуля `schedule` (Issue #57). Не являются
выгрузкой реального Excel-файла и не содержат персональных данных.

# banan: структура Excel уточняется

Точный формат листов Excel в `docs/Task.md` §4 не зафиксирован, поэтому JSON
описывает поля, которые перечислены в §4, в удобном для тестов виде.

## Файлы

| Файл | Назначение |
|---|---|
| `basic_schedule.json` | Расписание двух групп (БПИ-211, БПИ-212), подгруппы 1/2, числитель и знаменатель |
| `empty_schedule.json` | Пустой массив — случай без пар |
| `invalid_schedule.json` | Валидный JSON, но с неверными типами полей — для проверки валидации и обработки ошибок |

## Структура записи

Каждый файл, кроме `invalid_schedule.json`, содержит массив объектов:

```json
{
  "day_of_week": "monday",
  "start_time": "09:00",
  "end_time": "10:30",
  "course": 2,
  "direction": "09.03.01",
  "program": "Программная инженерия",
  "group": "БПИ-211",
  "subgroup": null,
  "subject": "Математический анализ",
  "subject_id": "math-analysis",
  "teacher": "Иванов Иван Иванович",
  "room": "101",
  "building": "Корпус А",
  "lesson_type": "lecture",
  "week_parity": "both",
  "notes": []
}
```

Поля:

- `day_of_week` — день недели: `monday` … `sunday`;
- `start_time`, `end_time` — время звонка в формате `HH:MM`;
- `course` — курс (число);
- `direction`, `program` — направление и профиль/специализация;
- `group` — группа, `subgroup` — подгруппа (`null` для пары всей группы);
- `subject`, `subject_id` — название и стабильный идентификатор предмета;
- `teacher` — ФИО преподавателя;
- `room`, `building` — аудитория и корпус;
- `lesson_type` — `lecture`, `practice`, `lab`, `seminar`;
- `week_parity` — `numerator`, `denominator` или `both`;
- `notes` — служебные пометки (`ДО`, `ВУЦ`, `ФК`, `ВК`, `НИР`).

## Использование в тестах

```python
import json
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures" / "schedule"


def load_fixture(name: str) -> list[dict[str, object]]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_parses_basic_schedule() -> None:
    pairs = load_fixture("basic_schedule.json")
    assert len(pairs) == 14
```

`invalid_schedule.json` читается тем же способом, но ожидается ошибка
валидации схемы (например, `course` приходит строкой, `week_parity` —
значением `"odd"`).
