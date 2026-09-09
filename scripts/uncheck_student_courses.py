#!/usr/bin/env python3
"""
Uncheck / clear course assignments for students.

Default behavior (safe):
  Remove enrollments that are NOT required by any batch the student is in.
  Batch-linked courses stay enrolled.

Options:
  --all              Remove ALL course enrollments (including batch-linked)
  --student NAME     Only affect matching student(s)
  --dry-run          Show what would be deleted without deleting
  --resync-batch     After cleanup, re-ensure batch members have their batch courses

Usage:
  py scripts/uncheck_student_courses.py --dry-run
  py scripts/uncheck_student_courses.py --student Batata
  py scripts/uncheck_student_courses.py --student Batata --dry-run
  py scripts/uncheck_student_courses.py --all --student Ash
  py scripts/uncheck_student_courses.py --resync-batch
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
    parser = argparse.ArgumentParser(
        description="Uncheck/clear student course assignments"
    )
    parser.add_argument("--student", help="Filter by student name/username/email")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Also remove batch-linked courses (dangerous)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview deletions only",
    )
    parser.add_argument(
        "--resync-batch",
        action="store_true",
        help="After cleanup, ensure every batch member has all batch courses enrolled",
    )
    args = parser.parse_args()

    env = {**load_env(ROOT / ".env"), **os.environ}
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL missing")
        return 1

    print("=" * 68)
    print("UNCHECK STUDENT COURSE ASSIGNMENTS")
    print("=" * 68)
    print(
        f"Mode: {'REMOVE ALL enrollments' if args.all else 'REMOVE direct-only (keep batch courses)'}"
    )
    if args.dry_run:
        print("DRY RUN — no deletes will be committed")
    print()

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='public' AND table_name='batch_courses'
                """
            )
            has_batch_courses = cur.fetchone() is not None

            student_filter_sql = ""
            params: list = []
            if args.student:
                student_filter_sql = """
                  AND (
                    u.username ILIKE %s OR u.email ILIKE %s
                    OR u.first_name ILIKE %s OR u.last_name ILIKE %s
                    OR (u.first_name || ' ' || u.last_name) ILIKE %s
                  )
                """
                params = [f"%{args.student}%"] * 5

            # Build required (batch-locked) course set per user
            if has_batch_courses:
                locked_sql = """
                    SELECT be.user_id, bc.course_id
                    FROM batch_enrollments be
                    JOIN batch_courses bc ON bc.batch_id = be.batch_id
                """
            else:
                locked_sql = """
                    SELECT be.user_id, b.course_id
                    FROM batch_enrollments be
                    JOIN batches b ON b.id = be.batch_id
                """

            cur.execute(locked_sql)
            locked_pairs = {(r[0], r[1]) for r in cur.fetchall()}

            cur.execute(
                f"""
                SELECT e.id, e.user_id, u.first_name || ' ' || u.last_name AS student,
                       u.username, e.course_id, c.title
                FROM enrollments e
                JOIN users u ON u.id = e.user_id
                JOIN courses c ON c.id = e.course_id
                WHERE u.role = 'student'
                {student_filter_sql}
                ORDER BY u.id, c.title
                """,
                params,
            )
            rows = cur.fetchall()

            to_delete = []
            keep = []
            for eid, user_id, student, username, course_id, title in rows:
                is_locked = (user_id, course_id) in locked_pairs
                if args.all or not is_locked:
                    to_delete.append((eid, user_id, student, username, course_id, title, is_locked))
                else:
                    keep.append((eid, user_id, student, username, course_id, title))

            print(f"Found {len(rows)} enrollment(s) in scope")
            print(f"Will remove: {len(to_delete)}")
            print(f"Will keep (batch-locked): {len(keep)}")
            print()

            if to_delete:
                print("Removals:")
                for eid, user_id, student, username, course_id, title, is_locked in to_delete[:50]:
                    tag = " [WAS BATCH]" if is_locked else ""
                    print(
                        f"  - enroll#{eid} {student} (@{username}) <- [{course_id}] {title}{tag}"
                    )
                if len(to_delete) > 50:
                    print(f"  ... and {len(to_delete) - 50} more")
            else:
                print("Nothing to remove.")

            if keep and not args.all:
                print("\nKept (via batch):")
                for eid, user_id, student, username, course_id, title in keep[:30]:
                    print(
                        f"  + enroll#{eid} {student} (@{username}) <- [{course_id}] {title}"
                    )
                if len(keep) > 30:
                    print(f"  ... and {len(keep) - 30} more")

            if not args.dry_run and to_delete:
                ids = [r[0] for r in to_delete]
                cur.execute("DELETE FROM enrollments WHERE id = ANY(%s)", (ids,))
                print(f"\nDeleted {cur.rowcount} enrollment row(s)")

            if args.resync_batch and not args.dry_run:
                if has_batch_courses:
                    cur.execute(
                        """
                        INSERT INTO enrollments (user_id, course_id, enrolled_at, progress)
                        SELECT DISTINCT be.user_id, bc.course_id, NOW(), 0
                        FROM batch_enrollments be
                        JOIN batch_courses bc ON bc.batch_id = be.batch_id
                        JOIN users u ON u.id = be.user_id
                        WHERE u.role = 'student'
                          AND NOT EXISTS (
                            SELECT 1 FROM enrollments e
                            WHERE e.user_id = be.user_id AND e.course_id = bc.course_id
                          )
                        """
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO enrollments (user_id, course_id, enrolled_at, progress)
                        SELECT DISTINCT be.user_id, b.course_id, NOW(), 0
                        FROM batch_enrollments be
                        JOIN batches b ON b.id = be.batch_id
                        JOIN users u ON u.id = be.user_id
                        WHERE u.role = 'student'
                          AND NOT EXISTS (
                            SELECT 1 FROM enrollments e
                            WHERE e.user_id = be.user_id AND e.course_id = b.course_id
                          )
                        """
                    )
                print(f"Resynced batch courses: inserted {cur.rowcount} enrollment(s)")

            if not args.dry_run:
                conn.commit()
                print("Committed.")
            else:
                print("\nDry run complete — no changes written.")

            print("=" * 68)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
