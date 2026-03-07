# Clearline

Personal finance management: track income, manage budgets, and prepare for taxes. One responsive web app for computer and phone, with household sharing and an Atlanta Falcons–inspired UI (dark/light themes).

**Stack (per PRD):** React + Vite + TypeScript, Node.js API (Vercel serverless), Supabase, hosted on Vercel.

---

## How This Repo Is Developed: Spec-Driven Development

Clearline is built using **Spec-Driven Development** with [GitHub Spec Kit](https://github.com/github/spec-kit). Specifications and plans are created first; implementation follows the generated task list.

### Workflow

| Step | Command | What it does |
|------|--------|----------------|
| 1 | **`/speckit.constitution`** | Define project principles (quality, testing, NFRs, tech stack). Stored in `.specify/memory/constitution.md`. |
| 2 | **`/speckit.specify`** | Create or update a feature spec (user stories, requirements). Specs live under `.specify/specs/<feature>/spec.md`. |
| 3 | **`/speckit.clarify`** *(optional)* | Ask structured questions to resolve ambiguity before planning. Run before `/speckit.plan` if needed. |
| 4 | **`/speckit.plan`** | Produce a technical implementation plan (architecture, data model, contracts) from the spec and your tech choices. |
| 5 | **`/speckit.tasks`** | Break the plan into ordered, actionable tasks in `tasks.md`. |
| 6 | **`/speckit.analyze`** *(optional)* | Check consistency across spec, plan, and tasks. Run after tasks, before implement. |
| 7 | **`/speckit.implement`** | Execute the task list and build the feature. |

Use these **slash commands in Cursor** (or your configured AI agent) while in this repo; the agent uses the contents of `.specify/` and the PRD to drive decisions.

### Canonical product source: PRD

The single source of truth for product and requirements is **[Clearline.md](Clearline.md)** (the PRD). Feature specs in `.specify/specs/` should reference it and summarize user stories and requirement IDs (e.g. `FR-AUTH-000`, `FR-BUDGET-INCOME-001`) rather than duplicate the full text.

### Feature folders and env

- One feature per folder: `.specify/specs/001-<feature-name>/` (e.g. `001-clearline-mvp`).
- Each feature can have: `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/`, etc.
- If you are **not** using Git branches per feature, set the active feature so plan/tasks/implement target the right folder:
  - **`SPECIFY_FEATURE=001-clearline-mvp`** (or your feature directory name) in the environment where the agent runs.

### Prerequisites

- **Spec Kit CLI:** `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git` (requires [uv](https://docs.astral.sh/uv/getting-started/installation/) and Python 3.11+).
- **This repo:** Already initialized with `specify init . --ai cursor-agent --script ps`. No need to run init again unless you re-bootstrap.
- **Implementation:** Node.js, npm/pnpm, and (for full app) Supabase and Vercel as in the PRD.

### Quick start (new feature)

1. Open the repo in Cursor.
2. Run **`/speckit.constitution`** once (or when principles change), using Clearline.md goals and NFRs.
3. Run **`/speckit.specify`** to add or update a feature spec (e.g. “Clearline MVP” from the PRD).
4. Run **`/speckit.plan`** with your stack (e.g. “React + Vite + TypeScript, Node API on Vercel, Supabase”). Refine plan/docs if needed.
5. Run **`/speckit.tasks`** to generate `tasks.md`.
6. Set **`SPECIFY_FEATURE`** to your feature folder name if you’re not using feature branches.
7. Run **`/speckit.implement`** to execute the tasks.

---

## Repo layout (relevant to Spec-Driven Development)

```
Clearline/
├── Clearline.md          # PRD — product and requirements source of truth
├── README.md             # This file
├── .gitignore
├── .specify/
│   ├── memory/
│   │   └── constitution.md
│   ├── specs/
│   │   └── 001-<feature>/
│   │       ├── spec.md
│   │       ├── plan.md
│   │       └── tasks.md
│   ├── scripts/          # PowerShell helpers for spec-kit
│   └── templates/
└── .cursor/              # Cursor slash commands (/speckit.*)
```

Code lives under `src/` (e.g. `src/frontend/`, `src/api/`) and appears as features are implemented via `/speckit.implement`.

---

## Links

- [GitHub Spec Kit](https://github.com/github/spec-kit) — toolkit and docs
- [Clearline.md](Clearline.md) — full Product Requirements Document
