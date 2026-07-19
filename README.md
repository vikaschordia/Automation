# Daily Task Tracker

A centralized daily task tracking system — replaces Excel-based task tracking for a team spread
across multiple companies and departments. Assign tasks, track progress/priority/delay, see
dashboards, run reports, and export to Excel.

This is a **local-only** build (no Docker, no cloud database) — see [Scope](#scope) below for
what's included in this pass vs. deferred.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — UI + API routes in one app
- **Tailwind CSS v4** + **shadcn/ui** — corporate blue/white theme, dark mode
- **Prisma + SQLite** — the whole database is a single file at `prisma/dev.db`, zero install
- **JWT auth** (`jose` + `bcryptjs`) — httpOnly cookie session, role-based access (Admin/Employee)
- **TanStack Table + TanStack Query** — the spreadsheet task view and all data fetching
- **Recharts** — dashboard charts
- **ExcelJS** — styled `.xlsx` exports (colored priority cells, frozen header, auto-filter)
- **Zod + react-hook-form** — validation, both client and server side
- **Vitest** — unit tests for the business-logic layer (delay calc, RBAC, formatting)

## Getting started

Requires [Node.js](https://nodejs.org) 20+ (nothing else — no Docker, no Postgres to install).

```bash
npm install
npm run db:migrate    # creates prisma/dev.db and applies the schema
npm run db:seed       # 3 companies, 10 departments, 10 employees, ~69 sample tasks
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with one of the seeded accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@tasktracker.local` | `Passw0rd!` |
| Employee | `rohit.sharma@tasktracker.local` (or any other seeded employee — see console output after seeding) | `Passw0rd!` |

Change `SEED_DEFAULT_PASSWORD` in `.env` before seeding if you want a different default password.

### Other scripts

```bash
npm run build        # production build
npm run start         # run the production build
npm test              # run the Vitest unit tests
npm run db:studio     # Prisma Studio — browse/edit the SQLite data visually
npm run db:reset       # wipe and re-migrate + re-seed the database
npm run lint           # ESLint
```

## What's implemented (Phase 1)

- **Auth & RBAC** — JWT session cookie, Admin vs Employee roles. Employees can only see their own
  tasks and can only edit Status / Progress / Remarks / Completion Date / Actual Hours — every
  other field (priority, due date, assignee, company, department...) is locked server-side
  regardless of what the client sends (`src/lib/rbac.ts`), not just hidden in the UI.
- **Master data** — Companies, Departments, Employees (with manager hierarchy, active/inactive
  status, optional login creation) — full CRUD.
- **Tasks** — full CRUD, auto-numbered (`TSK-000123`), priority (color-coded: red/orange/green),
  7 statuses, auto-computed delay (`completedDate − dueDate`, or `today − dueDate` if still open,
  0 if not yet due — see `src/lib/delay.ts`), tags, categories, estimated/actual hours, activity
  timeline (every create/status-change/completion is logged to `TaskHistory`).
- **Spreadsheet view** (`/tasks`) — sortable, filterable, resizable, paginated, sticky first
  column, inline-editable status/progress/remarks, bulk status/priority update for admins.
- **Dashboards** — Admin: 8 stat cards, 6 charts (department/company/priority breakdown, employee
  performance, monthly completion trend, delay trend), dashboard alerts (overdue/due
  today/tomorrow/high priority). Employee: today's/urgent/upcoming/pending tasks, completion %,
  recent activity feed.
- **Reports** (`/reports`) — task-level reports filterable by employee/department/company/
  priority/status/date-range (with Today/Last 7 days/Last 30 days/This year presets), Employee
  Performance report (total/completed/pending/delayed/avg delay/avg completion time/priority
  split per employee). Every report exports to a styled `.xlsx` (colored header, frozen pane,
  auto-filter, priority-colored cells, generated-by/generated-on footer). Individual employee
  reports are exportable from the Employees page.
- **Global search** — instant task + employee search from the topbar.
- **Dark / light mode**.

## Scope

The full spec this was built from covers roughly 100 features. Building all of them to genuine
production quality in one pass wasn't realistic, so this was deliberately split in two:

**Included here:** everything listed above — the full daily-driver workflow end to end.

**Deferred (not built):** recurring tasks, PDF export, calendar views (month/week/day), comments
& @mentions, a dedicated audit-trail UI (the data is captured in `TaskHistory` already — only the
UI to browse/filter it is missing), persisted/pushed notifications (dashboard alerts are computed
live instead), bulk Excel import, saved filters / pinned / favorite tasks, archive & restore
(tasks already soft-delete via `deletedAt` — only the restore UI is missing), and spreadsheet
copy/paste.

**Also simplified vs. the original spec, per explicit direction:** SQLite instead of PostgreSQL,
and no Docker — both because this only needs to run locally, not be production-deployed. The
architecture (Prisma schema, service layer, RBAC) doesn't preclude switching to Postgres + Docker
later if that changes; swapping `datasource db { provider = "sqlite" }` for `"postgresql"` in
`prisma/schema.prisma` is close to the entire migration since no SQLite-specific SQL is used
anywhere in application code.

## Project structure

```
prisma/schema.prisma       # data model (see inline comments for design notes)
prisma/seed.ts              # demo data generator
src/
  app/
    (auth)/login/            # public login page
    (dashboard)/              # everything behind the sidebar layout (admin + employee)
    api/                      # route handlers — thin, delegate to lib/services
  components/                 # ui/ (shadcn primitives) + feature folders
  lib/
    services/                 # business logic (task mutations, RBAC-safe updates, reports)
    validations/               # Zod schemas, shared by client forms and API routes
    excel/                     # ExcelJS sheet builders
    auth.ts, session.ts, rbac.ts, delay.ts, constants.ts   # core cross-cutting logic
  hooks/                       # TanStack Query hooks, one per resource
src/proxy.ts                   # route protection (Next.js 16 renamed middleware.ts → proxy.ts)
```

## Notes on the stack's bleeding edge

This was built against **Next.js 16**, **React 19**, **Tailwind v4**, and **Zod v4** — all
recent major versions with real breaking changes from what most tutorials still show
(`middleware.ts` → `proxy.ts`, async `params`/`cookies()`/`headers()`, Prisma 7's new
driver-adapter requirement — pinned to Prisma 6 here to avoid it). If you upgrade any of these
later, check their migration guides before assuming old patterns still apply.
