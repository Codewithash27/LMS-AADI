#!/usr/bin/env python3
"""Wipe ALL course enrollments and batch student memberships (clean slate)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    import psycopg
except ImportError:
    print("ERROR: pip install 'psycopg[binary]'")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        env[key.strip()] = value
    return env


def main() -> int:
    env = {**load_env(ROOT / ".env"), **os.environ}
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL missing")
        return 1

    print("=" * 60)
    print("CLEAN SLATE: remove all course assigns + batch students")
    print("=" * 60)

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM enrollments")
            e_before = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM batch_enrollments")
            b_before = cur.fetchone()[0]
            print(f"Before: enrollments={e_before}, batch_enrollments={b_before}")

            cur.execute("DELETE FROM batch_enrollments")
            print(f"Removed {cur.rowcount} batch membership(s)")

            cur.execute("DELETE FROM enrollments")
            print(f"Removed {cur.rowcount} course enrollment(s)")

            conn.commit()

            cur.execute("SELECT COUNT(*) FROM enrollments")
            e_after = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM batch_enrollments")
            b_after = cur.fetchone()[0]
            print(f"After:  enrollments={e_after}, batch_enrollments={b_after}")
            print("DONE")
            print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
