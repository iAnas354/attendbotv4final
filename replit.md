# Discord Attendance Bot

بوت ديسكورد لتسجيل الدخول والخروج، حفظ صور الإثبات، وعرض تقارير الساعات والجرد الأسبوعي.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required runtime variable: `DISCORD_BOT_TOKEN` — Discord bot token, configured in Railway Variables for Railway deployments

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/discord/attendance-bot.ts` — Discord commands, bilingual buttons/modals, evidence flow, and weekly report scheduler
- `lib/db/src/schema/attendance.ts` — attendance settings, member language preferences, shifts, and immutable event records
- `DISCORD_ATTENDANCE_SETUP.md` — server setup and usage guide

## Architecture decisions

- The bot runs alongside the existing API server workflow so it has one persistent process and one database connection.
- Attendance shifts are stored separately from attendance events; events preserve the original audit trail.
- Evidence is submitted from a modal as a file upload or an image URL; the member's Arabic/English preference is persisted per server.
- The timezone is configured as Africa/Cairo for display and automatic report scheduling.

## Product

- Employees record check-in and check-out with optional image evidence.
- Auditors can inspect individual hours and create weekly reports.
- Administrators configure the log channel, audit role, and optional bot-admin role from Discord.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
