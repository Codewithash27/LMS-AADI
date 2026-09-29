import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, "");
  }

  const user = process.env.PGUSER;
  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE;
  if (user && host && database) {
    const port = process.env.PGPORT || "5432";
    const password = process.env.PGPASSWORD ?? "";
    const encoded = encodeURIComponent(password);
    return `postgresql://${user}:${encoded}@${host}:${port}/${database}`;
  }

  throw new Error(
    "DATABASE_URL must be set. Create a .env file in the project root (copy .env.example), " +
      "then set DATABASE_URL=postgresql://user:password@localhost:5432/your_db " +
      "or set PGUSER, PGPASSWORD, PGHOST, PGPORT, and PGDATABASE."
  );
}

const connectionString = resolveDatabaseUrl();

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
