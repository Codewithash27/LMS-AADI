# LMS Setup & Installation Guide

**Project:** Learning Management System (Edu Transform)  
**Designed & Deployed by:** Aman Hukkerikar  
**Stack:** React + Vite (frontend) · Express + TypeScript (backend) · PostgreSQL

This guide helps your college team clone, install, and run the project locally.

---

## 1. Software to Install

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v18 or higher (LTS recommended) | https://nodejs.org |
| **npm** | Comes with Node.js | — |
| **PostgreSQL** | v12 or higher (v16–18 OK) | https://www.postgresql.org/download/ |
| **Git** | Latest | https://git-scm.com |

Optional (AI chat features):
- Together AI API key(s) from https://together.ai

---

## 2. Clone the Repository

```bash
git clone https://github.com/Codewithash27/LMS-Learning-Management-System.git
cd LMS-Learning-Management-System
```

---

## 3. Install Dependencies

```bash
npm install
```

This installs both frontend and backend packages (single project).

---

## 4. Create PostgreSQL Database

1. Open PostgreSQL (pgAdmin or `psql`).
2. Create a database:

```sql
CREATE DATABASE lms_db;
```

3. Note your PostgreSQL username and password (often `postgres` / your password).

---

## 5. Environment Variables

Copy the example file and edit values:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/lms_db
PGDATABASE=lms_db
PGHOST=localhost
PGPORT=5432
PGUSER=USERNAME
PGPASSWORD=PASSWORD
SESSION_SECRET=change-this-to-any-long-random-string
NODE_ENV=development
PORT=5000
TOGETHER_API_KEYS=
TOGETHER_API_KEY=
```

**Important**
- Replace `USERNAME` and `PASSWORD` with your PostgreSQL credentials.
- If the password contains special characters (e.g. `@`), URL-encode them in `DATABASE_URL` (example: `@` → `%40`).
- Do **not** commit your real `.env` file (it contains secrets).

---

## 6. Push Database Schema

```bash
npm run db:push
```

If you have a SQL backup dump, restore it into `lms_db` instead (or after) using `psql`.

Optional schema fix for older dumps (if login fails with `plain_password` missing):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password text;
```

---

## 7. Run Frontend + Backend

Frontend and backend run **together** with one command:

```bash
npm run dev
```

Open in browser:

**http://localhost:5000**

---

## 8. Default Admin Login (after your own seed/reset)

Create an admin user via Register (first user becomes admin), or reset password in DB.

Example (if already seeded):

- Username: `admin`
- Password: *(set by your team — do not share production passwords in git)*

---

## 9. Useful Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (API + UI) |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run db:push` | Sync Drizzle schema to PostgreSQL |
| `npm run check` | TypeScript check |
| `python check_lms_system.py` | Smoke-check app + DB row counts |

---

## 10. Common Issues

### Port already in use (`EADDRINUSE :5000`)
Another process is using port 5000. Stop it, then run `npm run dev` again.

Windows:

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
npm run dev
```

### `DATABASE_URL must be set`
Create `.env` from `.env.example` and set `DATABASE_URL`.

### `column "plain_password" does not exist`
Run:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password text;
```

Then restart `npm run dev`.

### Login fails after DB restore
Passwords are hashed. Reset admin password using the app’s hash format, or register a new first user on a fresh DB.

---

## 11. Project Structure (short)

```
LMS-Learning-Management-System/
├── client/          # React frontend (Vite)
├── server/          # Express backend + API
├── shared/          # Shared schema/types
├── uploads/         # Uploaded files
├── .env.example     # Env template (safe to share)
├── REPORT.md        # This setup guide
└── package.json     # Scripts & dependencies
```

---

## 12. Contact / Credit

**Designed & Deployed by Aman Hukkerikar**

For setup help, contact the project owner of this repository.
