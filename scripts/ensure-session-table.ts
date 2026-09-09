import { pool } from "../server/db";

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire)
    `);
    console.log("Session table ready");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
