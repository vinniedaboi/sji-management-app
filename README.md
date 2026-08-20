# SJI International Staff Hub

A local-first, Vercel-adaptable staff homepage branded for St. Joseph's Institution International and built from `School_Staff_Hub_MVP_Specification.docx`. It combines a targeted official bulletin, teacher community board, events, documents/SOPs, quick links, staff directory, global search, acknowledgements, notifications, and administration.

## Run locally

Requirements: Node.js 20.11 or newer.

```bash
npm install
copy .env.example .env.local
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The repository already includes a local `.env.local`; copying the example is only needed after a clean checkout.

Use `npm run db:reset` to rebuild the local demo database from migrations and seed data.

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
npm run db:migrate   # Apply checked-in SQL migrations
npm run db:seed      # Re-seed an existing database
npm run db:reset     # Safely reset only the local file database
```

## Architecture

- Next.js App Router, React, TypeScript strict mode, and responsive CSS.
- libSQL/SQLite via `@libsql/client`: a file database for localhost and a hosted libSQL database for Vercel.
- Signed, HTTP-only session cookie with bcrypt password verification.
- Server actions validate roles and ownership on every mutation.
- Audience rows support `all_staff`, role, department, and specific-user targeting. All search and content queries are filtered on the server.
- SQL migrations live in `migrations/`; repeatable seed scripts live in `scripts/`.

Uploaded file bytes are intentionally not stored in the repository or public directory. The MVP document form accepts a private/external resource URL. A production school deployment should connect its existing private drive or an object store with signed access before accepting sensitive files.

## Vercel adaptation

The application uses standard Next.js APIs and does not depend on Cloudflare workers or a local-only runtime. For a Vercel deployment:

1. Create a hosted libSQL database (for example, Turso).
2. Set `DATABASE_URL` to its `libsql://...` URL and set `DATABASE_AUTH_TOKEN`.
3. Set a long random `AUTH_SECRET` and the school name/timezone variables from `.env.example`.
4. Run `npm run db:migrate` and `npm run db:seed` against that database from a controlled environment.
5. Import the repository into Vercel and use the default Next.js build settings.

Do not use the local `file:` database on Vercel; serverless filesystems are not durable. `npm run db:reset` refuses to run against a remote URL as a safety measure.

## Permissions

- Teachers see targeted active content and manage their own Staff Board posts/replies.
- Department Heads can publish and archive notices only for their own department.
- Admins manage school content, acknowledgements, moderation, and audit history.
- System Admins additionally manage roles, departments, and account activation.
- Scheduled and expired notices are excluded from active views. Admin visibility does not bypass mutation checks.

## Privacy notes

The demo contains fictional data only. Before a real pilot, replace demo credentials, require a managed identity provider, review student-data minimization, connect private file storage, configure backups, and complete the school’s privacy/security review.

Deferred scope is recorded in [FUTURE.md](./FUTURE.md).
