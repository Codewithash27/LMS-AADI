import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example to .env and set your Postgres connection string."
  );
  process.exit(1);
}

const { pool } = await import("../server/db");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        batch_id INTEGER NULL,
        tenant_id INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        due_date TIMESTAMP NULL,
        accepting_submissions BOOLEAN NOT NULL DEFAULT TRUE,
        reference_doc_url TEXT NULL,
        reference_doc_password TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        github_url TEXT NULL,
        drive_url TEXT NULL,
        other_url TEXT NULL,
        notes TEXT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_feedback TEXT NULL,
        reviewed_at TIMESTAMP NULL,
        reviewed_by INTEGER NULL,
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS assignment_submissions_assignment_user_uidx
      ON assignment_submissions (assignment_id, user_id)
    `);

    console.log("Migration OK (assignments, assignment_submissions).");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
