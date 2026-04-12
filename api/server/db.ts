import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import { drizzle as drizzlePGLite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "../../shared/schema.js";

let db: any;
let pool: any;

let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (connectionString) {
  try {
    const url = new URL(connectionString);
    // Remove channel_binding which causes issues with the pg driver and Neon
    url.searchParams.delete("channel_binding");
    connectionString = url.toString();
  } catch (e) {
    // If URL parsing fails, fallback to simple string replacement
    connectionString = connectionString.replace(/&?channel_binding=[^&]*/g, "");
  }
  
  console.log("[db] Connecting to External Postgres...");
  pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  db = drizzle(pool, { schema });
} else {
  console.log("[db] Falling back to PGLite (Local Storage)...");
  const client = new PGlite({
    dataDir: "./.local/pglite"
  });
  db = drizzlePGLite(client, { schema });
  pool = client;
}

export { db, pool };
