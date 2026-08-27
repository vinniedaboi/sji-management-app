# SJI International Staff Hub

A staff homepage branded for St. Joseph's Institution International and built from `School_Staff_Hub_MVP_Specification.docx`. It combines a targeted official bulletin, daily cover management, teacher community board, events, documents/SOPs, quick links, staff directory, global search, acknowledgements, notifications, and administration. Data is stored in Supabase (Postgres).

The Cover workspace tracks staff absences and lesson-level requirements across Periods 1–8. Teachers can volunteer for open cover, coordinators can approve applications or assign colleagues directly, and the board prevents absence, assignment, and same-period application conflicts. Cover coordinators can publish the selected day as a Markdown table in the official notices feed. Notice bodies support GitHub-flavoured Markdown, including headings, lists, links, blockquotes, and tables.

## Run locally

Requirements: Node.js 20.11 or newer, and a Supabase project.

```bash
npm install
copy .env.example .env.local     # then fill in DATABASE_URL (see below)
npm run db:setup                 # create the schema + seed demo data
npm run dev
```

Set `DATABASE_URL` in `.env.local` to your Supabase connection string (Dashboard → **Connect**). The app keeps all of its tables in a dedicated `staffhub` schema, so one Supabase project can also host other apps.

Open [http://localhost:3000](http://localhost:3000).

Use `npm run db:reset` to re-apply migrations and re-seed the demo data (this only touches the `staffhub` schema).

## Demo accounts

Every demo account uses the password `SchoolHub123!`.

| Access | Email |
| --- | --- |
| Teacher | `emma.morgan@school.test` |
| Department Head | `sarah.lee@school.test` |
| Admin | `olivia.brown@school.test` |
| System Admin | `alex.chen@school.test` |

The seed contains 14 staff users in seven departments, 12 official notices (including scheduled and expired examples), eight Staff Board posts, ten replies, eight events, ten documents, and eight Quick Links.

## Useful commands

```bash
npm run dev          # Local development server
npm run build        # Production/Vercel build
npm run typecheck    # TypeScript validation
npm run lint         # ESLint and accessibility rules
npm test             # Permission helper tests
npm run db:migrate   # Apply checked-in SQL migrations (uses DATABASE_URL)
npm run db:seed      # Re-seed the staffhub schema with demo data
npm run db:reset     # Re-migrate and re-seed the staffhub schema
```

The `*:remote` variants (`db:migrate:remote`, `db:seed:remote`, `db:setup:remote`, `db:reset:remote`) read credentials from a git-ignored `.env.production.local` instead of the shell/`​.env.local`, which is handy for seeding a production database from your machine.

## Architecture

- Next.js App Router, React, TypeScript strict mode, and responsive CSS.
- Supabase (Postgres) accessed with the `pg` driver through a thin compatibility layer in `lib/db.ts`. All tables live in an isolated `staffhub` schema so the database is easy to move to its own project later (`pg_dump -n staffhub`).
- Signed, HTTP-only session cookie with bcrypt password verification.
- Server actions validate roles and ownership on every mutation.
- Audience rows support `all_staff`, role, department, and specific-user targeting. All search and content queries are filtered on the server.
- SQL migrations live in `migrations/`; repeatable seed scripts live in `scripts/`.

Uploaded file bytes are intentionally not stored in the repository or public directory. The MVP document form accepts a private/external resource URL. A production school deployment should connect its existing private drive or an object store with signed access before accepting sensitive files.

## Deploy to Vercel (public demo)

The app uses standard Next.js APIs. It talks to Supabase over a Postgres connection, so the deployed app needs a connection string with a password — set it in the Vercel project settings. The app fails loudly on Vercel if `DATABASE_URL` or `AUTH_SECRET` is missing, so a broken configuration never silently loses data.

**1. Provision the database.** The `staffhub` schema and demo data are already created in the Supabase project. To (re)create them from scratch elsewhere, put the connection string in a git-ignored `.env.production.local` and run `npm run db:setup:remote`.

**2. Get the connection string.** In the Supabase dashboard: **Connect → Transaction pooler** (port `6543`) — this is the pooled string suited to serverless. Replace `<password>` with your database password.

**3. Import the repo into Vercel** (default Next.js build settings — no `vercel.json` needed).

**4. Set the Environment Variables** in the Vercel project (Production, and Preview if you use it):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the Transaction-pooler connection string (port 6543) |
| `AUTH_SECRET` | a long random string — generate with the command below |
| `NEXT_PUBLIC_SCHOOL_NAME` | `St. Joseph's Institution International` |
| `NEXT_PUBLIC_SCHOOL_LOGO_URL` | the logo URL from `.env.example` |
| `NEXT_PUBLIC_SCHOOL_TIMEZONE` | `Asia/Singapore` |

`DATABASE_SCHEMA` defaults to `staffhub`; only set it if you renamed the schema.

Generate `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**5. Deploy.** The public demo is now live with the demo accounts below.

> This is a demo with fictional data and shared demo passwords — keep it behind a temporary URL and do not put real staff or student data in it. `npm run db:reset` only clears and re-seeds the `staffhub` schema; it does not touch anything else in the database.

### Moving to its own database later

Because everything lives in the `staffhub` schema, you can lift it into a standalone Supabase project at any time: `pg_dump --schema=staffhub` from the current database, restore into the new one, then point `DATABASE_URL` at it. No application code changes are needed.

## Permissions

- Teachers see targeted active content and manage their own Staff Board posts/replies.
- Department Heads can publish and archive notices only for their own department.
- Admins manage school content, acknowledgements, moderation, and audit history.
- System Admins additionally manage roles, departments, and account activation.
- Scheduled and expired notices are excluded from active views. Admin visibility does not bypass mutation checks.

## Privacy notes

The demo contains fictional data only. Before a real pilot, replace demo credentials, require a managed identity provider, review student-data minimization, connect private file storage, configure backups, and complete the school’s privacy/security review.

Deferred scope is recorded in [FUTURE.md](./FUTURE.md).
