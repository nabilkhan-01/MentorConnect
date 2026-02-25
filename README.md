# MentorConnect

Full-stack mentor–mentee management system (demo-ready).

MentorConnect is designed to provide a **centralized system for managing mentor–mentee relationships across all four academic years**.  
This repository exists so others can **run, explore, and evaluate** the system.

---

## 🧩 Problem

In my college, mentor–mentee records exist, but they are **not centralized**.

- Records are maintained separately for different academic years
- No single system provides a complete multi-year view of a student
- There is no integrated platform for mentoring activities such as
  communication, meetings, or feedback
- Long-term tracking and continuity are difficult

---

## 💡 Solution

MentorConnect provides a **single centralized platform** where:

- Mentor–mentee relationships are managed in one place
- Student data remains consistent across all four academic years
- **Group chats** are available for:
  - Mentors and their assigned mentees
  - Administrators and mentors
- **Meetings and feedback** between mentors and mentees can be recorded and reviewed
- Mentoring activities are structured rather than ad-hoc

The system focuses on clarity, structure, and real usability.

---

## ✅ Project Status

**Completed and demo-ready.**

- Read-only demo mode is enabled by default
- All records in the database are **system-generated**
- **No real student or faculty data is included**

---

## 📌 Why this project

This project was built based on a real limitation observed in my college environment.  
The goal was to design a **practical centralized system** for long-term mentorship rather than a short-term demo or tutorial project.

---

## 📁 What’s in this repo

- `client/`: React + Vite frontend
- `server/`: Express backend
- `db/`: Drizzle migrations + seed script

---

## 🔐 Safety & GitHub Notes

- **Real secrets must never be committed**
- This repo includes `.env.example` and ignores `.env`
- Demo data is resettable and safe for public use

---

## ⚙️ Local Setup

1) Install dependencies
`npm install`

2) Create environment file

Copy `.env.example` to `.env` and set:
- `DATABASE_URL`
- `SESSION_SECRET`
- `READ_ONLY_MODE=1` (default: blocks all edits; allows login + read-only API)
- `VITE_READ_ONLY_MODE=1` (default: blocks client-side write requests)
- `DEMO_SEED_RESET=1` (seed will wipe/recreate demo data)

## 🗄️ Database

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
- Admin: `admin` / `admin123` 
- Mentors: `mentor`, `mentor2`, `mentor3`, `mentor4`, `mentor5` / `mentor123`
- Mentees: `mentee`, `mentee02` … `mentee20` / `mentee123` 

5) ▶️ Run in Development

`npm run dev`

App runs on `http://localhost:3000` by default.

## 🚀 Deployment (Optional)

You can deploy without purchasing a domain using platforms like
Render, Railway, or Fly.io.

Minimum required environment variables

-DATABASE_URL
-SESSION_SECRET
-NODE_ENV=production


### Render (Simple Setup)
1) Push this repo to GitHub
2) Create a free Postgres DB on Neon (or Supabase) and copy the connection string
3) On Render: create a **Web Service** from this repo
	- Build command: `npm install && npm run build`
	- Start command: `npm run start:render`
4) Set env vars on Render:
	- `DATABASE_URL` = (Neon/Supabase connection string)
	- `SESSION_SECRET` = long random string
	- `NPM_CONFIG_PRODUCTION` = `false` (ensures devDependencies like Vite are installed during build)

On free Render accounts without Shell access, the start command runs schema + seed automatically on first deploy.

📝 Notes:
- The single website link is your Render Web Service URL.
- Free hosting plans may sleep when idle
- Most hosted PostgreSQL providers require TLS; SSL is enabled automatically in production
- Render Blueprint deployment is supported via render.yaml

🔒 Data Disclaimer
All data present in this project is automatically generated and used strictly for demonstration purposes.
No real student or faculty information is stored or processed.
