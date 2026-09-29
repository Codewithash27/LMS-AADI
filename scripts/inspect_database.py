#!/usr/bin/env python3
"""
List PostgreSQL tables and row counts for the LMS database.

Reads DATABASE_URL from project .env (never hardcode passwords here).

Usage:
  py scripts/inspect_database.py
  py scripts/inspect_database.py --sample
  py scripts/inspect_database.py --env-file "D:/path/to/.env"

Uses project root .env by default (.env overrides system environment for DB settings).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    import psycopg
except ImportError:
    print("ERROR: psycopg not installed. Run: py -m pip install 'psycopg[binary]'")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]

KEY_TABLES = [
    "tenants",
    "users",
    "courses",
    "modules",
    "lessons",
    "enrollments",
    "exams",
    "questions",
    "exam_attempts",
    "batches",
    "batch_courses",
    "batch_enrollments",
    "assignments",
    "assignment_submissions",
    "activity_logs",
    "lesson_progress",
    "session",
    "theme_templates",
]


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def merge_env(env_file: Path) -> dict[str, str]:
    """System env first, then project .env — values in .env win."""
    file_env = load_env(env_file)
    merged = dict(os.environ)
    for key, value in file_env.items():
        if value != "":
            merged[key] = value
    return merged


def database_url_from_env(env: dict[str, str]) -> str | None:
    url = env.get("DATABASE_URL", "").strip()
    if url:
        return url
    if not env.get("PGHOST"):
        return None
    from urllib.parse import quote_plus

    user = env.get("PGUSER", "postgres")
    password = env.get("PGPASSWORD", "")
    host = env.get("PGHOST", "localhost")
    port = env.get("PGPORT", "5432")
    db = env.get("PGDATABASE", "lms_db")
    return f"postgresql://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{db}"


def redact_database_url(url: str) -> str:
    """Host/db only — never print password."""
    try:
        from urllib.parse import urlparse

        p = urlparse(url)
        host = p.hostname or "?"
        port = p.port or 5432
        db = (p.path or "/").lstrip("/") or "?"
        user = p.username or "?"
        return f"postgresql://{user}:***@{host}:{port}/{db}"
    except Exception:
        return "(DATABASE_URL set)"


def table_exists(cur, name: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (name,),
    )
    return cur.fetchone() is not None


def column_exists(cur, table: str, column: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s AND column_name = %s
        """,
        (table, column),
    )
    return cur.fetchone() is not None


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect LMS Postgres tables and data counts")
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Print latest rows from exams, questions, users",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=ROOT / ".env",
        help="Path to .env (default: project root .env)",
    )
    args = parser.parse_args()

    env_path = args.env_file.resolve()
    if not env_path.exists():
        print(f"ERROR: Env file not found: {env_path}")
        print("Copy .env.example to .env and set DATABASE_URL / PG* variables.")
        return 1

    env = merge_env(env_path)
    database_url = database_url_from_env(env)
    if not database_url:
        print(f"ERROR: No DATABASE_URL (or PGHOST/PGUSER/PGPASSWORD) in {env_path}")
        return 1

    print("=" * 70)
    print("LMS DATABASE INSPECTOR")
    print("=" * 70)
    print(f"Env file: {env_path}")
    print(f"Connect:  {redact_database_url(database_url)}")
    print()

    try:
        with psycopg.connect(database_url, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT current_database(), current_user, version()")
                db_name, db_user, version = cur.fetchone()
                print(f"Connected: db={db_name} user={db_user}")
                print(f"Postgres: {version.split(',')[0]}")
                print()

                cur.execute(
                    """
                    SELECT tablename FROM pg_tables
                    WHERE schemaname = 'public'
                    ORDER BY tablename
                    """
                )
                all_tables = [r[0] for r in cur.fetchall()]
                print(f"Public tables ({len(all_tables)}):")
                for t in all_tables:
                    print(f"  - {t}")
                print()

                print("Row counts (core LMS tables):")
                print(f"{'Table':<28} {'Rows':>10}  Status")
                print("-" * 52)
                for name in KEY_TABLES:
                    if name not in all_tables:
                        print(f"{name:<28} {'—':>10}  (missing)")
                        continue
                    cur.execute(f'SELECT COUNT(*) FROM "{name}"')
                    count = cur.fetchone()[0]
                    print(f"{name:<28} {count:>10}  OK")

                print()
                print("MCQ / exam schema checks:")
                checks = [
                    ("exams", "exam_type"),
                    ("questions", "options"),
                    ("questions", "correct_option"),
                    ("exam_attempts", "score"),
                    ("exam_attempts", "max_score"),
                ]
                for table, column in checks:
                    if not table_exists(cur, table):
                        print(f"  {table}.{column}: table missing")
                        continue
                    if column_exists(cur, table, column):
                        print(f"  {table}.{column}: present")
                    else:
                        print(f"  {table}.{column}: MISSING — run: npx tsx scripts/migrate-exam-type.ts")

                if table_exists(cur, "exams") and column_exists(cur, "exams", "exam_type"):
                    cur.execute(
                        """
                        SELECT COALESCE(exam_type, 'null'), COUNT(*)
                        FROM exams GROUP BY exam_type ORDER BY 2 DESC
                        """
                    )
                    rows = cur.fetchall()
                    print()
                    print("Exams by type:")
                    for exam_type, cnt in rows:
                        print(f"  {exam_type}: {cnt}")

                if args.sample:
                    print()
                    print("Sample data (latest 5):")
                    if table_exists(cur, "exams"):
                        cur.execute(
                            """
                            SELECT id, title, course_id,
                                   COALESCE(exam_type::text, 'n/a') AS exam_type,
                                   accepting_responses
                            FROM exams ORDER BY id DESC LIMIT 5
                            """
                        )
                        print("  exams:", cur.fetchall())
                    if table_exists(cur, "users"):
                        cur.execute(
                            """
                            SELECT id, username, role, email FROM users
                            ORDER BY id DESC LIMIT 5
                            """
                        )
                        print("  users:", cur.fetchall())

    except psycopg.OperationalError as e:
        print(f"CONNECTION FAILED: {e}")
        print("Check .env DATABASE_URL, Postgres running, password, and database lms_db exists.")
        return 1

    print()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
