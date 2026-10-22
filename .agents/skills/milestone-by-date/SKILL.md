---
name: milestone-by-date
description: Assign the correct iteration milestone to a GitHub issue or PR of Zeta by a date. Use when creating, planning or triaging issues, or when asked which iteration a task belongs to.
---

# Milestone by date

Source of truth for iteration dates: `docs/Roadmap.md` (timeline block). Iteration milestones in GitHub are named `<name> (дд.мм–дд.мм)` and mirror it. Do not hardcode dates here.

## Steps

1. Pick the date: the issue's planned end (Project `Target date`), or the date the user gave. Dates are in 2026.
2. List open iteration milestones:
   ```bash
   gh api repos/Ivansups/Zeta/milestones --jq '.[] | select(.title|test("^(Итерация|Стабилизация)")) | [.number,.title]|@tsv'
   ```
3. Parse the `дд.мм–дд.мм` range from each title and choose the one that contains the date (inclusive). A weekend date belongs to the range that contains it.
4. Set it:
   ```bash
   gh issue edit <number> --milestone "<exact title>"
   ```
5. If no range contains the date, or titles disagree with `docs/Roadmap.md`, stop and report it. Fix milestones to match the Roadmap, never the other way round.

Phase milestones (`Фаза N`) are course phases, not iterations. Leave them as they are.
