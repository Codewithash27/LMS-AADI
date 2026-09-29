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
      ALTER TABLE exams
      ADD COLUMN IF NOT EXISTS exam_type TEXT NOT NULL DEFAULT 'theory'
    `);
    await client.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS options JSONB NULL
    `);
    await client.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS correct_option INTEGER NULL
    `);
    await client.query(`
      ALTER TABLE exam_attempts
      ADD COLUMN IF NOT EXISTS score INTEGER NULL
    `);
    await client.query(`
      ALTER TABLE exam_attempts
      ADD COLUMN IF NOT EXISTS max_score INTEGER NULL
    `);

    const backfill = await client.query(`
      UPDATE exam_attempts
      SET
        score = (regexp_match(feedback, 'Auto-graded MCQ:\\s*(\\d+)\\s*/\\s*(\\d+)'))[1]::integer,
        max_score = (regexp_match(feedback, 'Auto-graded MCQ:\\s*(\\d+)\\s*/\\s*(\\d+)'))[2]::integer
      WHERE score IS NULL
        AND feedback ~ 'Auto-graded MCQ:\\s*\\d+\\s*/\\s*\\d+'
    `);

    console.log(
      `Migration OK (exam_type, options, correct_option, score, max_score). Backfilled ${backfill.rowCount ?? 0} row(s).`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
