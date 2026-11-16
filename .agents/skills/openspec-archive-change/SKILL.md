---
name: openspec-archive-change
description: Archive a completed change in the experimental workflow, auto-sync delta specs, and generate project documentation in docs/code-changes/. Use when the user wants to finalize and archive a change after implementation is complete.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.1"
  generatedBy: "customized for Zeta"
---

Archive a completed change in the experimental workflow, automatically sync specifications to main specs without operator prompting, generate a permanent record in `docs/code-changes/`, and update the central change registry.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `artifacts`: List of artifacts with their status (`done` or other)

   **If any artifacts are not `done`:**
   - Display warning listing incomplete artifacts
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically `tasks.md` at `openspec/changes/<name>/tasks.md`) to check for incomplete tasks.

   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Automatically sync delta specs (NO OPERATOR PROMPTING)**

   Check for delta specs at `openspec/changes/<name>/specs/`. If none exist, proceed to step 5.

   **If delta specs exist:**
   Do **NOT** ask the operator or wait for user confirmation. Automatically apply delta specs to main specs at `openspec/specs/<capability>/spec.md` following these rules:
   - For each capability delta spec at `openspec/changes/<name>/specs/<capability>/spec.md`:
     - If main spec `openspec/specs/<capability>/spec.md` does not exist: create directory `openspec/specs/<capability>/` and write `spec.md` with a Purpose section and the ADDED requirements.
     - If main spec exists:
       - **ADDED Requirements:** Append requirement blocks if not present, or update existing.
       - **MODIFIED Requirements:** Locate requirement in main spec and update scenarios / descriptions while preserving unaffected content.
       - **REMOVED Requirements:** Delete the matching requirement block.
       - **RENAMED Requirements:** Rename matching requirement header.
   - Note the synced capabilities for the final summary.

5. **Generate project documentation in `docs/code-changes/`**

   Before moving the change folder, synthesize a comprehensive documentation document in Russian for `docs/code-changes/`.

   a. **Collect change metadata**:
      - Date: `YYYY-MM-DD` (today's date)
      - Read `openspec/changes/<name>/proposal.md` for context, problem description, impact, and referenced issues / PRs.
      - Read `openspec/changes/<name>/design.md` for technical design, architecture, schemas, and trade-offs.
      - Read `openspec/changes/<name>/specs/*/spec.md` for delta requirements summary.
      - Read `openspec/changes/<name>/tasks.md` for completed tasks.
      - Determine affected packages (`backend`, `frontend`, `mobile`, `telegram-bot`, `infra`).
      - Determine current iteration by comparing the date against iteration date ranges in `docs/Roadmap.md` (e.g. `Итерация 1 (20.10–03.11)`).

   b. **Ensure target directory exists**:
      ```bash
      mkdir -p docs/code-changes
      ```

   c. **Write `docs/code-changes/YYYY-MM-DD-<name>.md`** following this exact structure in Russian:

      ```markdown
      # [Изменение] <Краткое понятное название изменения / фичи>

      > **Change ID:** `<name>`  
      > **Дата:** `YYYY-MM-DD`  
      > **Итерация:** `Итерация N (дд.мм–дд.мм)` *(по Roadmap.md)*  
      > **Затронутые пакеты:** `<список пакетов, напр. backend, frontend>`  
      > **Связанные задачи:** `Refs #<issue>` / `Task.md §<раздел>` *(если применимо)*  
      > **Архив OpenSpec:** `openspec/changes/archive/YYYY-MM-DD-<name>/`

      ---

      ## 1. Контекст и мотивация (Зачем?)
      *(Выжимка из proposal.md)*
      - **Проблема:** Какая проблема решалась или какое требование внедрялось.
      - **Обоснование:** Зачем это нужно пользователю / системе / команде.

      ## 2. Что сделано (Что изменилось?)
      *(Выжимка из proposal.md, tasks.md и фактически измененных компонентов)*
      - **`<пакет>/`:** перечень реализованных возможностей, компонентов, модулей.

      ## 3. Архитектурные решения (Как?)
      *(Выжимка из design.md)*
      - **Модели данных и схемы:** изменения в БД, миграции, контракты API.
      - **Логика и безопасность:** ключевые алгоритмы, валидации, обработка ошибок.
      - **Компромиссы (Trade-offs):** почему выбран такой подход, ограничения.

      ## 4. Спецификации и требования (OpenSpec Delta)
      *(Выжимка из specs/*/spec.md или отметка "Спецификации не менялись")*
      - Добавленные или обновленные требования и сценарии.

      ## 5. Выполненные задачи
      *(Список выполненных задач из tasks.md)*
      - [x] Задача 1
      - [x] Задача 2

      ## 6. Проверка и тестирование (QA)
      *(Статус проверок по AGENTS.md)*
      - **Линтеры и форматирование:** статус линтеров затронутых пакетов.
      - **Статическая типизация:** статус `mypy` / `typecheck`.
      - **Тесты:** статус `pytest` / `pnpm test` (добавленные юнит/интеграционные тесты).
      - **Миграции / Инфраструктура:** статус применения миграций или деплоя (если применимо).
      ```

   d. **Update `docs/code-changes/README.md` registry**:
      - If `docs/code-changes/README.md` does not exist, create it with the title and table:
        ```markdown
        # Реестр изменений кодовой базы (Code Changes)

        В данном каталоге фиксируются фактические результаты реализации функционала и архитектурных изменений проекта Zeta, сформированные при архивировании OpenSpec-спецификаций.

        | Дата | Change ID | Пакеты | Итерация | Описание | Документ |
        |---|---|---|---|---|---|
        ```
      - Add a new row to the table:
        `| YYYY-MM-DD | <name> | <пакеты> | Итерация N | <краткое описание> | [YYYY-MM-DD-<name>.md](./YYYY-MM-DD-<name>.md) |`

6. **Perform the archive**

   Create the archive directory if it doesn't exist:
   ```bash
   mkdir -p openspec/changes/archive
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move the change directory to archive

   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

7. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Specs sync: `✓ Automatically synced to main specs` (or `No delta specs`)
   - Documentation generated: `docs/code-changes/YYYY-MM-DD-<name>.md`
   - Registry updated: `docs/code-changes/README.md`
   - Archive location: `openspec/changes/archive/YYYY-MM-DD-<name>/`
   - Note about any warnings (incomplete artifacts/tasks)

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Specs:** ✓ Automatically synced to main specs (or "No delta specs")
**Documentation:** [YYYY-MM-DD-<name>.md](../../docs/code-changes/YYYY-MM-DD-<name>.md)
**Registry:** [docs/code-changes/README.md](../../docs/code-changes/README.md)
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/

All artifacts complete. All tasks complete.
```

**Guardrails**
- Always prompt for change selection if not provided.
- Use artifact graph (`openspec status --json`) for completion checking.
- Don't block archive on warnings - just inform and confirm.
- **NEVER prompt operator for delta spec sync confirmation** - automatically sync delta specs to `openspec/specs/` whenever they exist.
- Always generate the report in `docs/code-changes/YYYY-MM-DD-<name>.md` in Russian before moving the change directory.
- Maintain the table registry in `docs/code-changes/README.md`.
- Preserve `.openspec.yaml` when moving to archive (it moves with the directory).
- Show clear summary of what happened.
