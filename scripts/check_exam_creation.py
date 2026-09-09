#!/usr/bin/env python3
"""
Verify exam (test) creation and diagnose why a student may not see an exam.

Checks:
  1) Exam exists (by title / id / latest)
  2) Exam has questions
  3) duration / batch_id / accepting_responses
  4) Student course enrollment vs exam.course_id
  5) Student batch enrollment vs exam.batch_id
  6) Simulated visibility decision

Usage:
  py scripts/check_exam_creation.py
  py scripts/check_exam_creation.py --title Test
  py scripts/check_exam_creation.py --student Batata
  py scripts/check_exam_creation.py --exam-id 12 --student batata
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
    parser = argparse.ArgumentParser(description="Verify LMS exam creation & student visibility")
    parser.add_argument("--title", help="Exam title substring (default: latest exams)")
    parser.add_argument("--exam-id", type=int, help="Specific exam id")
    parser.add_argument(
        "--student",
        default="Batata",
        help="Student username / name / email substring (default: Batata)",
    )
    args = parser.parse_args()

    env = {**load_env(ROOT / ".env"), **os.environ}
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL missing in .env")
        return 1

    print("=" * 64)
    print("EXAM CREATION + STUDENT VISIBILITY CHECK")
    print("=" * 64)

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            # --- find exams ---
            if args.exam_id:
                cur.execute(
                    """
                    SELECT id, title, description, course_id, tenant_id, created_by,
                           accepting_responses, duration, batch_id
                    FROM exams WHERE id = %s
                    """,
                    (args.exam_id,),
                )
            elif args.title:
                cur.execute(
                    """
                    SELECT id, title, description, course_id, tenant_id, created_by,
                           accepting_responses, duration, batch_id
                    FROM exams
                    WHERE title ILIKE %s
                    ORDER BY id DESC
                    LIMIT 10
                    """,
                    (f"%{args.title}%",),
                )
            else:
                cur.execute(
                    """
                    SELECT id, title, description, course_id, tenant_id, created_by,
                           accepting_responses, duration, batch_id
                    FROM exams
                    ORDER BY id DESC
                    LIMIT 10
                    """
                )

            exams = cur.fetchall()
            if not exams:
                print("FAIL: No exams found matching criteria")
                return 1

            print(f"\nFound {len(exams)} exam(s):\n")
            for exam in exams:
                (
                    exam_id,
                    title,
                    description,
                    course_id,
                    tenant_id,
                    created_by,
                    accepting,
                    duration,
                    batch_id,
                ) = exam

                cur.execute("SELECT COUNT(*) FROM questions WHERE exam_id = %s", (exam_id,))
                qcount = cur.fetchone()[0]
                cur.execute("SELECT title FROM courses WHERE id = %s", (course_id,))
                course_row = cur.fetchone()
                course_title = course_row[0] if course_row else f"<missing course {course_id}>"

                batch_name = None
                if batch_id is not None:
                    cur.execute("SELECT name FROM batches WHERE id = %s", (batch_id,))
                    brow = cur.fetchone()
                    batch_name = brow[0] if brow else f"<missing batch {batch_id}>"

                ok_questions = qcount > 0
                ok_published = accepting is not False
                print(f"  [{exam_id}] {title}")
                print(f"      course     : {course_id} — {course_title}")
                print(f"      duration   : {duration} min")
                print(f"      published  : {accepting}  ({'OK' if ok_published else 'CLOSED'})")
                print(f"      batch_id   : {batch_id} {f'({batch_name})' if batch_name else '(all course students)'}")
                print(f"      questions  : {qcount}  ({'OK' if ok_questions else 'FAIL — no questions'})")
                print(f"      created_by : {created_by}  tenant={tenant_id}")
                print(
                    f"      create OK  : {'YES' if ok_questions and ok_published else 'PARTIAL / ISSUE'}"
                )
                print()

            # --- find student ---
            cur.execute(
                """
                SELECT id, username, first_name, last_name, email, role, tenant_id
                FROM users
                WHERE role = 'student'
                  AND (
                    username ILIKE %s
                    OR email ILIKE %s
                    OR first_name ILIKE %s
                    OR last_name ILIKE %s
                    OR (first_name || ' ' || last_name) ILIKE %s
                  )
                ORDER BY id
                LIMIT 10
                """,
                tuple([f"%{args.student}%"] * 5),
            )
            students = cur.fetchall()
            if not students:
                print(f"WARN: No student matched '{args.student}'")
                return 0

            print("-" * 64)
            print(f"STUDENT MATCHES for '{args.student}':\n")

            focus_exam = exams[0]
            (
                exam_id,
                title,
                _desc,
                course_id,
                _tenant,
                _by,
                accepting,
                _duration,
                batch_id,
            ) = focus_exam

            for student in students:
                sid, username, first, last, email, role, tenant_id = student
                print(f"  Student [{sid}] {first} {last} (@{username}) <{email}>")

                cur.execute(
                    "SELECT course_id FROM enrollments WHERE user_id = %s ORDER BY course_id",
                    (sid,),
                )
                enrolled_courses = {r[0] for r in cur.fetchall()}
                print(f"    enrolled courses: {sorted(enrolled_courses) or 'NONE'}")

                cur.execute(
                    "SELECT batch_id FROM batch_enrollments WHERE user_id = %s ORDER BY batch_id",
                    (sid,),
                )
                enrolled_batches = {r[0] for r in cur.fetchall()}
                print(f"    enrolled batches: {sorted(enrolled_batches) or 'NONE'}")

                in_course = course_id in enrolled_courses
                published = accepting is not False
                # Access gate: course enrollment (batch is metadata for admin targeting)
                can_see = published and in_course

                print(f"    checking exam [{exam_id}] '{title}':")
                print(f"      in exam course?  {in_course}")
                print(f"      published?       {published}")
                print(f"      exam.batch_id    {batch_id} (informational)")
                print(f"      WOULD SEE EXAM?  {'YES' if can_see else 'NO'}")

                if not can_see:
                    print("      WHY NOT:")
                    if not published:
                        print("        - Exam is unpublished / not accepting responses")
                    if not in_course:
                        print(
                            f"        - Student not enrolled in course_id={course_id}. "
                            "Assign that course to the student (or enroll via a batch that includes it)."
                        )
                print()

            print("=" * 64)
            print("Tip: For PDF-created exams, also confirm questions count > 0 above.")
            print("Run again with --title \"YourExamTitle\" or --exam-id N")
            print("=" * 64)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
