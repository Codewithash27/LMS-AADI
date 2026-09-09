import { pool } from "../server/db";

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE batches
      ADD COLUMN IF NOT EXISTS end_date date
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_courses (
        id serial PRIMARY KEY,
        batch_id integer NOT NULL,
        course_id integer NOT NULL
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS batch_courses_batch_course_uidx
      ON batch_courses (batch_id, course_id)
    `);

    // Backfill primary course for existing batches
    await client.query(`
      INSERT INTO batch_courses (batch_id, course_id)
      SELECT b.id, b.course_id
      FROM batches b
      WHERE NOT EXISTS (
        SELECT 1 FROM batch_courses bc
        WHERE bc.batch_id = b.id AND bc.course_id = b.course_id
      )
    `);

    console.log("Migration OK: batches.end_date + batch_courses");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
