#!/usr/bin/env python3
"""
LMS runtime + data smoke check.

What it verifies:
1) Frontend page is reachable.
2) Backend API routes respond without server errors.
3) Core database tables exist and row counts are reported.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ENV_PATH = ROOT / ".env"
APP_URL = "http://localhost:5000"
API_CHECKS = [
    "/api/auth/me",
    "/api/courses",
    "/api/exams",
    "/api/batches",
    "/api/reports/student-progress",
]
TABLES_TO_COUNT = [
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
    "batch_enrollments",
    "activity_logs",
    "lesson_progress",
    "session",
]


def load_env_file(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        env[key] = val
    return env


def http_check(url: str) -> tuple[bool, int | None, str]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "lms-checker/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.getcode()
            body = resp.read(250).decode("utf-8", errors="replace")
            return status < 500, status, body
    except urllib.error.HTTPError as err:
        body = err.read(250).decode("utf-8", errors="replace")
        return err.code < 500, err.code, body
    except Exception as exc:  # noqa: BLE001
        return False, None, str(exc)


def find_psql() -> str | None:
    candidates = [
        r"C:\PostgreSQL\18\bin\psql.exe",
        r"C:\Program Files\PostgreSQL\18\bin\psql.exe",
        r"C:\Program Files\PostgreSQL\17\bin\psql.exe",
        r"C:\Program Files\PostgreSQL\16\bin\psql.exe",
    ]
    for exe in candidates:
        if Path(exe).exists():
            return exe
    return None


def run_psql_count_query(psql: str, database_url: str) -> dict[str, int]:
    values = ", ".join(f"('{tbl}')" for tbl in TABLES_TO_COUNT)
    sql = f"""
WITH target_tables(table_name) AS (
  VALUES {values}
)
SELECT tt.table_name, COUNT(t.*)::bigint AS row_count
FROM target_tables tt
LEFT JOIN LATERAL (
  SELECT * FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = tt.table_name AND c.relkind = 'r'
) tab ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM public."session" WHERE tt.table_name = 'session'
) sess ON FALSE
LEFT JOIN LATERAL (
  SELECT * FROM public.activity_logs WHERE tt.table_name = 'activity_logs'
) t ON FALSE
GROUP BY tt.table_name
ORDER BY tt.table_name;
"""
    # The query above only confirms table presence; use per-table queries for accurate counts.
    counts: dict[str, int] = {}
    env = os.environ.copy()
    env["PGCONNECT_TIMEOUT"] = "10"
    for table in TABLES_TO_COUNT:
        count_sql = f'SELECT COUNT(*) FROM public."{table}";'
        cmd = [psql, database_url, "-tAc", count_sql]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            check=False,
        )
        if proc.returncode != 0:
            raise RuntimeError(
                f"Count query failed for {table}: {proc.stderr.strip() or proc.stdout.strip()}"
            )
        value = proc.stdout.strip()
        counts[table] = int(value) if value else 0
    return counts


def main() -> int:
    file_env = load_env_file(ENV_PATH)
    runtime_env = os.environ.copy()
    runtime_env.update(file_env)

    print("=== LMS Runtime Check ===")
    ok_front, status_front, body_front = http_check(APP_URL)
    print(f"Frontend ({APP_URL}): {'OK' if ok_front else 'FAIL'} status={status_front}")
    if not ok_front:
        print(f"  details: {body_front}")

    api_overall = True
    print("\n=== API Route Checks ===")
    for route in API_CHECKS:
        ok, status, body = http_check(f"{APP_URL}{route}")
        api_overall = api_overall and ok
        snippet = body.replace("\n", " ")[:120]
        print(f"{route}: {'OK' if ok else 'FAIL'} status={status} body={snippet}")

    print("\n=== Database Counts ===")
    database_url = runtime_env.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL not found in .env")
        return 2

    psql = find_psql()
    if not psql:
        print("psql.exe not found in expected locations.")
        return 2

    try:
        counts = run_psql_count_query(psql, database_url)
    except Exception as exc:  # noqa: BLE001
        print(f"Database count check failed: {exc}")
        return 2

    total_rows = 0
    for table, count in counts.items():
        total_rows += count
        print(f"{table}: {count}")
    print(f"TOTAL_ROWS(core tables): {total_rows}")

    overall = ok_front and api_overall
    print("\n=== Verdict ===")
    print("System appears UP" if overall else "System has issues")
    return 0 if overall else 1


if __name__ == "__main__":
    sys.exit(main())
