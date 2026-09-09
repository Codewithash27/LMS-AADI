/**
 * Smoke-check admin reports aggregate shape without HTTP auth.
 * Usage: npx tsx scripts/smoke_admin_reports.ts
 */
import "dotenv/config";
import { storage } from "../server/storage";

async function main() {
  const tenantId = 1;
  const users = await storage.getUsersByTenant(tenantId);
  const courses = await storage.getCoursesByTenant(tenantId);
  const exams = await storage.getExamsByTenant(tenantId);
  const batches = await storage.getBatchesByTenant(tenantId);
  const attempts = await storage.getAllExamAttemptsForAdmin(tenantId);
  const students = users.filter((u) => u.role === "student");

  const enrollmentsByCourse = await Promise.all(
    courses.map(async (course) => ({
      course,
      enrollments: await storage.getEnrollmentsByCourse(course.id),
    }))
  );

  const batchesOut = await Promise.all(
    batches.map(async (batch) => {
      const courseIds = await storage.getBatchCourseIds(batch.id);
      const members = await storage.getBatchEnrollmentsByBatch(batch.id);
      return {
        id: batch.id,
        name: batch.name,
        studentCount: members.length,
        courseCount: courseIds.length,
      };
    })
  );

  const payload = {
    summary: {
      students: students.length,
      batches: batches.length,
      courses: courses.length,
      enrollments: enrollmentsByCourse.reduce((s, x) => s + x.enrollments.length, 0),
      exams: exams.length,
      examAttempts: attempts.length,
    },
    batches: batchesOut,
    courses: enrollmentsByCourse.map(({ course, enrollments }) => ({
      id: course.id,
      title: course.title,
      enrolled: enrollments.length,
    })),
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      attempts: attempts.filter((a) => a.examId === e.id).length,
    })),
  };

  console.log(JSON.stringify(payload, null, 2));
  console.log("\nSMOKE_OK");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
