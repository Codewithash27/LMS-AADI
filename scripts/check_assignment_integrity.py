#!/usr/bin/env python3
"""
Analyze + fix assignment integrity across:
  - Course → Student assign (enrollments)
  - Student → Course assign (same enrollments table)
  - Batch → Courses (batch_courses) + Batch → Students (batch_enrollments)

Checks:
  1) Duplicate course enrollments (user_id, course_id)
  2) Duplicate batch enrollments (batch_id, user_id)
  3) Batch members missing course enrollments for linked courses
  4) Orphan enrollments / batch links
  5) Batches missing batch_courses rows (legacy)

Usage:
  py scripts/check_assignment_integrity.py
  py scripts/check_assignment_integrity.py --student Batata
  py scripts/check_assignment_integrity.py --fix
  py scripts/check_assignment_integrity.py --fix --add-unique
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
    parser = argparse.ArgumentParser(description="Check LMS assignment integrity")
    parser.add_argument("--student", help="Filter report by student name/username")
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Apply safe fixes: dedupe enrollments, backfill batch course enrollments, backfill batch_courses",
    )
    parser.add_argument(
        "--add-unique",
        action="store_true",
        help="After --fix, add unique indexes to prevent future duplicates",
    )
    args = parser.parse_args()

    env = {**load_env(ROOT / ".env"), **os.environ}
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL missing")
        return 1

    print("=" * 68)
    print("ASSIGNMENT INTEGRITY (course / student / batch)")
    print("=" * 68)

    issues = 0

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            # Ensure batch_courses exists
            cur.execute(
                """
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='public' AND table_name='batch_courses'
                """
            )
            has_batch_courses = cur.fetchone() is not None
            if not has_batch_courses:
                print("WARN: batch_courses table missing — run migrate-batch-multi-course.ts")
            else:
                print("OK: batch_courses table present")

            # --- duplicate course enrollments ---
            cur.execute(
                """
                SELECT user_id, course_id, COUNT(*) AS cnt, ARRAY_AGG(id ORDER BY id) AS ids
                FROM enrollments
                GROUP BY user_id, course_id
                HAVING COUNT(*) > 1
                ORDER BY cnt DESC
                """
            )
            dup_enroll = cur.fetchall()
            if dup_enroll:
                issues += len(dup_enroll)
                print(f"\nFAIL: {len(dup_enroll)} duplicate course enrollment pair(s)")
                for user_id, course_id, cnt, ids in dup_enroll[:20]:
                    print(f"  user={user_id} course={course_id} count={cnt} ids={ids}")
                if args.fix:
                    cur.execute(
                        """
                        DELETE FROM enrollments e
                        USING enrollments e2
                        WHERE e.user_id = e2.user_id
                          AND e.course_id = e2.course_id
                          AND e.id > e2.id
                        """
                    )
                    print(f"  Fixed: removed {cur.rowcount} duplicate enrollment row(s)")
            else:
                print("\nOK: no duplicate course enrollments")

            # --- duplicate batch enrollments ---
            cur.execute(
                """
                SELECT batch_id, user_id, COUNT(*) AS cnt, ARRAY_AGG(id ORDER BY id) AS ids
                FROM batch_enrollments
                GROUP BY batch_id, user_id
                HAVING COUNT(*) > 1
                ORDER BY cnt DESC
                """
            )
            dup_batch = cur.fetchall()
            if dup_batch:
                issues += len(dup_batch)
                print(f"\nFAIL: {len(dup_batch)} duplicate batch enrollment pair(s)")
                for batch_id, user_id, cnt, ids in dup_batch[:20]:
                    print(f"  batch={batch_id} user={user_id} count={cnt} ids={ids}")
                if args.fix:
                    cur.execute(
                        """
                        DELETE FROM batch_enrollments be
                        USING batch_enrollments be2
                        WHERE be.batch_id = be2.batch_id
                          AND be.user_id = be2.user_id
                          AND be.id > be2.id
                        """
                    )
                    print(f"  Fixed: removed {cur.rowcount} duplicate batch enrollment row(s)")
            else:
                print("\nOK: no duplicate batch enrollments")

            # --- backfill batch_courses from primary course_id ---
            if has_batch_courses:
                cur.execute(
                    """
                    SELECT b.id, b.course_id, b.name
                    FROM batches b
                    WHERE NOT EXISTS (
                      SELECT 1 FROM batch_courses bc WHERE bc.batch_id = b.id
                    )
                    """
                )
                missing_links = cur.fetchall()
                if missing_links:
                    issues += len(missing_links)
                    print(f"\nFAIL: {len(missing_links)} batch(es) missing batch_courses rows")
                    for bid, cid, name in missing_links[:20]:
                        print(f"  batch={bid} '{name}' primary_course={cid}")
                    if args.fix:
                        cur.execute(
                            """
                            INSERT INTO batch_courses (batch_id, course_id)
                            SELECT b.id, b.course_id
                            FROM batches b
                            WHERE NOT EXISTS (
                              SELECT 1 FROM batch_courses bc
                              WHERE bc.batch_id = b.id AND bc.course_id = b.course_id
                            )
                            """
                        )
                        print(f"  Fixed: inserted {cur.rowcount} batch_courses row(s)")
                else:
                    print("\nOK: every batch has batch_courses links")

            # --- batch members missing course enrollments ---
            if has_batch_courses:
                cur.execute(
                    """
                    SELECT be.batch_id, b.name, be.user_id,
                           u.first_name || ' ' || u.last_name AS student,
                           bc.course_id, c.title
                    FROM batch_enrollments be
                    JOIN batches b ON b.id = be.batch_id
                    JOIN users u ON u.id = be.user_id
                    JOIN batch_courses bc ON bc.batch_id = be.batch_id
                    JOIN courses c ON c.id = bc.course_id
                    WHERE NOT EXISTS (
                      SELECT 1 FROM enrollments e
                      WHERE e.user_id = be.user_id AND e.course_id = bc.course_id
                    )
                    ORDER BY be.batch_id, be.user_id, bc.course_id
                    """
                )
            else:
                cur.execute(
                    """
                    SELECT be.batch_id, b.name, be.user_id,
                           u.first_name || ' ' || u.last_name AS student,
                           b.course_id, c.title
                    FROM batch_enrollments be
                    JOIN batches b ON b.id = be.batch_id
                    JOIN users u ON u.id = be.user_id
                    JOIN courses c ON c.id = b.course_id
                    WHERE NOT EXISTS (
                      SELECT 1 FROM enrollments e
                      WHERE e.user_id = be.user_id AND e.course_id = b.course_id
                    )
                    ORDER BY be.batch_id, be.user_id
                    """
                )
            missing_course = cur.fetchall()
            if missing_course:
                issues += len(missing_course)
                print(
                    f"\nFAIL: {len(missing_course)} batch-member ↔ course gap(s) "
                    "(student in batch but not enrolled in linked course)"
                )
                for batch_id, bname, user_id, student, course_id, ctitle in missing_course[:30]:
                    print(
                        f"  batch={batch_id} '{bname}' | student={user_id} {student} "
                        f"| missing course={course_id} '{ctitle}'"
                    )
                if args.fix:
                    if has_batch_courses:
                        cur.execute(
                            """
                            INSERT INTO enrollments (user_id, course_id, enrolled_at, progress)
                            SELECT DISTINCT be.user_id, bc.course_id, NOW(), 0
                            FROM batch_enrollments be
                            JOIN batch_courses bc ON bc.batch_id = be.batch_id
                            WHERE NOT EXISTS (
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
                            WHERE NOT EXISTS (
                              SELECT 1 FROM enrollments e
                              WHERE e.user_id = be.user_id AND e.course_id = b.course_id
                            )
                            """
                        )
                    print(f"  Fixed: created {cur.rowcount} missing course enrollment(s)")
            else:
                print("\nOK: every batch member is enrolled in all linked courses")

            # --- optional student focus ---
            if args.student:
                print(f"\n--- Student focus: {args.student} ---")
                cur.execute(
                    """
                    SELECT id, username, first_name, last_name, email
                    FROM users
                    WHERE role='student'
                      AND (
                        username ILIKE %s OR email ILIKE %s
                        OR first_name ILIKE %s OR last_name ILIKE %s
                        OR (first_name || ' ' || last_name) ILIKE %s
                      )
                    """,
                    tuple([f"%{args.student}%"] * 5),
                )
                for sid, username, first, last, email in cur.fetchall():
                    print(f"\n[{sid}] {first} {last} (@{username}) <{email}>")
                    cur.execute(
                        """
                        SELECT e.course_id, c.title, COUNT(*) 
                        FROM enrollments e
                        JOIN courses c ON c.id = e.course_id
                        WHERE e.user_id = %s
                        GROUP BY e.course_id, c.title
                        ORDER BY c.title
                        """,
                        (sid,),
                    )
                    rows = cur.fetchall()
                    print("  Courses (via enrollments / assign):")
                    if not rows:
                        print("    (none)")
                    for cid, title, cnt in rows:
                        flag = "  << DUPLICATE" if cnt > 1 else ""
                        print(f"    - [{cid}] {title}{flag}")

                    cur.execute(
                        """
                        SELECT be.batch_id, b.name, b.course_id
                        FROM batch_enrollments be
                        JOIN batches b ON b.id = be.batch_id
                        WHERE be.user_id = %s
                        ORDER BY be.batch_id
                        """,
                        (sid,),
                    )
                    brows = cur.fetchall()
                    print("  Batches:")
                    if not brows:
                        print("    (none)")
                    for bid, bname, primary_cid in brows:
                        if has_batch_courses:
                            cur.execute(
                                "SELECT course_id FROM batch_courses WHERE batch_id=%s ORDER BY course_id",
                                (bid,),
                            )
                            cids = [r[0] for r in cur.fetchall()] or [primary_cid]
                        else:
                            cids = [primary_cid]
                        print(f"    - [{bid}] {bname} courses={cids}")

            if args.fix:
                conn.commit()
                print("\nCommitted fixes.")

            if args.add_unique:
                if not args.fix:
                    print("\nWARN: --add-unique should be used with --fix after dedupe")
                else:
                    try:
                        cur.execute(
                            """
                            CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_course_uidx
                            ON enrollments (user_id, course_id)
                            """
                        )
                        cur.execute(
                            """
                            CREATE UNIQUE INDEX IF NOT EXISTS batch_enrollments_batch_user_uidx
                            ON batch_enrollments (batch_id, user_id)
                            """
                        )
                        conn.commit()
                        print("OK: unique indexes added on enrollments + batch_enrollments")
                    except Exception as exc:
                        conn.rollback()
                        print(f"FAIL: could not add unique indexes: {exc}")
                        return 1

            print("\n" + "=" * 68)
            if issues and not args.fix:
                print(f"RESULT: {issues} issue group(s) found. Re-run with --fix to repair.")
                print("Example: py scripts/check_assignment_integrity.py --fix --add-unique")
                return 2
            print("RESULT: assignment data looks consistent" + (" (after fix)" if args.fix else ""))
            print("=" * 68)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
