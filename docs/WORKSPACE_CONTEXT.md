# Workspace Context — Simplified Architecture (Phase 1)

This document explains how the workspace context system is organized after the
Phase 1 simplification. The goal is one mental model with **no overlapping
concepts**.

## The three questions

Every page in the dashboard is scoped by answering three independent questions.
They appear, left → right, in the **workspace bar** at the top of every
authenticated page:

| Question | Concept     | Example values                  | Where it's managed            | Accent color |
|----------|-------------|---------------------------------|-------------------------------|--------------|
| **WHAT** | Project     | SauceDemo, Acme Web, …          | `/projects`                   | emerald      |
| **WHERE**| Environment | QA, Staging, Production         | `Settings → Environments`     | sky / typed  |
| **WHEN** | Sprint      | Sprint 23 (Mar 1 – Mar 14), …   | `Settings → Sprints`          | violet       |

That's it. There is exactly **one** place to manage each concept, and exactly
**one** control for each in the workspace bar.

### WHAT — Project
The application you are working on. Selected from the sidebar project selector.
A project owns repositories, environments and sprints.

### WHERE — Environment
The deployment target you test against — a URL plus a type
(`development` / `qa` / `staging` / `production`) and a health status. One
environment per project is the default. Color coding:

- `production` → red
- `staging` → amber
- `qa` / `test` → violet
- `development` → sky

### WHEN — Sprint
A time-based cycle (typically 2 weeks) used to **filter dashboards** and to
**track test execution & healing metrics over time**. Sprints have a name, a
start/end date and a status (`planned` / `active` / `completed`). The workspace
bar shows the active sprint plus a condensed progress indicator
(e.g. `Sprint 23 · 5d left · 64%`).

## What was removed and why

### ❌ "Release Config" (project-level)
Previously the `/projects` page had a **Release Config** panel storing
`release_cycle_type`, `release_cycle_days`, `release_day_of_week`,
`release_timezone` and `overview_default_range`.

This **duplicated the Sprint system** — "cycle type = sprint", "cycle duration"
and "sprint start day" are all sprint cadence concepts. Having two places to
configure time-based cycles is exactly what caused the confusion (and the
"release config vanished" reports). It has been **removed from the UI**.

- The backend columns and `PUT /api/projects/:id/release-config` endpoint are
  **kept for backward compatibility only** (marked legacy) so no data is lost,
  but they are no longer surfaced anywhere in the product.
- All time-based tracking now flows through **Sprints**.

### ❌ Separate "Time Range" dropdown
The workspace bar previously had a 4th dropdown (Last 7 / 30 / 90 days / custom)
**in addition** to the Sprint selector. Two "WHEN" controls is redundant. The
Sprint selector is now the single "WHEN" control, so the Time Range dropdown was
removed.

## Settings structure

```
Settings
├── Environments   (WHERE to test)
│   └── Manage QA / Staging / Production URLs, health, default
└── Sprints        (WHEN — time tracking)
    └── Cadence (duration, naming, auto-create) + Sprint timeline CRUD

Projects (WHAT)
└── Project name, description, repositories
```

## Where the data lives (backend)

- **Environments** → `project_environments` table.
- **Sprints** → `project_sprints` table, plus per-project `sprint_duration_weeks`,
  `auto_create_sprints`, `sprint_naming_pattern` columns on `projects`.
- **Legacy release columns** (`release_cycle_*`, `overview_default_range`) remain
  on `projects` but are dormant. Do **not** build new features on them — model
  any new "WHEN" concept as a Sprint. If true deployment/version tracking is
  needed later (e.g. `v2.5`, `v3.0`), it should get its own clearly-named
  `releases` concept, kept separate from sprints.

## Frontend building blocks

- `components/global-context-bar.tsx` — the workspace bar (3 labelled sections +
  trailing quick stats).
- `components/environment-selector.tsx` — WHERE dropdown (typed color badges,
  health dot, tooltip).
- `components/sprint-selector.tsx` — WHEN dropdown (date range, days-left,
  current badge, tooltip).
- `components/ui/anchored-menu.tsx` — portal-rendered dropdown used by the
  selectors so menus never get clipped by the bar's overflow/stacking context.
- `lib/workspace-context.tsx` — provider/hooks: `useProjectEnvironments`,
  `useProjectSprints`, `useProjectContext`.
