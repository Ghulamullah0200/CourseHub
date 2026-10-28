# CourseHub

University DBMS project: academy enrollment and fee management with PostgreSQL.

## Local setup

1. Install Node.js 20.9+ and run `npm install` in this directory.
2. Create a PostgreSQL database (Neon works with Vercel). Run `sql/schema.sql` in its SQL editor, then optionally `sql/seed.sql` **once in an empty database**.
3. Copy `.env.example` to `.env.local`. Set `DATABASE_URL`, a strong `ADMIN_PASSWORD` and an independent random `SESSION_SECRET`. Never commit these values.
4. Run `npm run dev`, visit http://localhost:3000 and sign in with the admin password.

## Vercel deployment

Import this folder as a Next.js project into Vercel. Create a Neon PostgreSQL database through the Vercel Marketplace or separately and set its pooled `DATABASE_URL` plus `ADMIN_PASSWORD` and `SESSION_SECRET` in Vercel environment settings. Run the SQL schema and optional seed script in Neon before opening the app. Deploy the project. Vercel hosts the app; Neon stores persistent SQL records. This package does not provision a database or publish to a user's Vercel account.

## Demo

Sign in → add a student/instructor/course → create a batch → enroll a student → record partial payment → view balance. Try enrolling a student twice, filling a capacity-one batch, and paying more than the balance; SQL constraints and triggers reject these changes. See `sql/demo_queries.sql` for join, available-seat, and revenue queries.

The project uses a single administrator account for academic demonstration. It does not implement individual student or instructor login, payment processing, refunds, or emails. Never enter real student data into a public demo without access controls and authorization.

## Neon services

The project is linked to `proud-silence-70149236`, branch `production`, in organization `org-shiny-term-39150659`. `neon.ts` declares the private `assets` bucket and the `hello` function (CourseHub export). Next.js hosts the UI and authenticated routes; Neon hosts the database, storage, and export function.

1. Run `npx.cmd neon@latest login` and complete browser sign-in.
2. Run `npx.cmd neon@latest deploy --env .env.local`. This provisions the services and pulls Neon-managed environment variables. Keep the locally generated `ADMIN_PASSWORD`, `SESSION_SECRET`, and `ORIGIN_SECRET` private. The function and app must share `ORIGIN_SECRET`.
3. Run `node scripts/setup-db.cjs` to install the tracked schema using `DATABASE_URL_UNPOOLED`. This does not seed demo data.
4. Run `npm.cmd run build`, then `npm.cmd start`.
5. In a separate terminal run `node scripts/test-neon.cjs`. This verifies authentication, database reads, function invocation, private object upload, and authenticated download. It retains one JSON export in the private bucket.

Sign in using `ADMIN_PASSWORD` from `.env.local`. **Export records** creates a consistent snapshot through the Neon Function, archives it in object storage, and downloads it through an authenticated app route. All credentials stay on the server. The existing `pg` driver and transactions are preserved for the Node.js runtime. Deployment requires a project region supporting Functions and Object Storage.
