# MentorConnect

Full-stack mentor–mentee management app (demo-ready).

## What’s in this repo
- `client/`: React + Vite frontend
- `server/`: Express backend
- `db/`: Drizzle migrations + seed script

## Safety / GitHub notes
- Real secrets must **never** be committed.
- This repo includes `.env.example` and ignores `.env`.

## Local setup

1) Install deps

`npm install`

2) Create environment file

Copy `.env.example` to `.env` and set:
- `DATABASE_URL`
- `SESSION_SECRET`
- `DEMO_SEED_RESET=1` (seed will wipe/recreate demo data)

## Database

This app requires a Postgres database.

Choose one:
- Local Postgres (install PostgreSQL and create a DB like `mentorconnect_demo`)
- Hosted Postgres (Neon / Supabase)

3) Create tables

`npm run db:push`

4) Seed demo data

`npm run db:seed:reset`

All seeded records are fake and are included only for demonstration (no real student data).

Demo users created by seed:
- Admin: `admin` / `admin123` (or `DEMO_ADMIN_PASSWORD`)
- Mentors: `mentor`, `mentor2`, `mentor3`, `mentor4`, `mentor5` / `mentor123` (or `DEMO_MENTOR_PASSWORD`)
- Mentees: `mentee`, `mentee02` … `mentee20` / `mentee123` (or `DEMO_MENTEE_PASSWORD`)

5) Run in dev

`npm run dev`

App runs on `http://localhost:3000` by default.

## Deploy (optional)
You can deploy without buying a domain using providers like Render / Railway / Fly.io.
At minimum you’ll need to set env vars: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`.

### Render (simple)
1) Push this repo to GitHub
2) Create a free Postgres DB on Neon (or Supabase) and copy the connection string
3) On Render: create a **Web Service** from this repo
	- Build command: `npm install && npm run build`
	- Start command: `npm run start`
4) Set env vars on Render:
	- `DATABASE_URL` = (Neon/Supabase connection string)
	- `SESSION_SECRET` = long random string
	- `NPM_CONFIG_PRODUCTION` = `false` (ensures devDependencies like Vite are installed during build)
	- `DEMO_SEED_RESET` = `1`
5) Run once (Render shell) to create tables + seed demo data:
	- `npm run db:push`
	- `npm run db:seed:reset`

Notes:
- The single website link is your Render Web Service URL.
- Free plans (if available) may sleep when idle.
- Most hosted Postgres providers require TLS; this project enables SSL automatically in production.

Optional:
- You can deploy with Render Blueprint by keeping `render.yaml` in the repo (you'll still paste `DATABASE_URL` + `SESSION_SECRET`).
