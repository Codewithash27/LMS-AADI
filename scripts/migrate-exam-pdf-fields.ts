import { pool } from "../server/db";

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE exams
      ADD COLUMN IF NOT EXISTS duration integer NOT NULL DEFAULT 60
    `);
    await client.query(`
      ALTER TABLE exams
      ADD COLUMN IF NOT EXISTS batch_id integer
    `);
    await client.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS model_answer text
    `);
    console.log("Migration OK: exams.duration, exams.batch_id, questions.model_answer");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
