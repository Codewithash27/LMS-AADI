// server/db.ts - AFTER
import 'dotenv/config';
import { Pool } from 'pg'; // Changed import
import { drizzle } from 'drizzle-orm/node-postgres'; // Changed import
// The 'ws' import is no longer needed
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema }); // Changed drizzle call