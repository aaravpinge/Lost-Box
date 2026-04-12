import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import { drizzle as drizzlePGLite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "../../shared/schema";

let db: any;
let pool: any;

if (process.env.POSTGRES_URL) {
  // Use Vercel Postgres in Production
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });
  db = drizzle(pool, { schema });
} else {
  // Fall back to PGLite for Local Development
  const client = new PGlite({
    dataDir: "./.local/pglite"
  });
  db = drizzlePGLite(client, { schema });
  pool = client;
}

export { db, pool };
