import { PGlite } from "@electric-sql/pglite";
import * as fs from "fs";
import * as path from "path";

async function setup() {
  const client = new PGlite({
    dataDir: "./.local/pglite"
  });

  const sql = fs.readFileSync(path.join(process.cwd(), "migrations", "0000_furry_revanche.sql"), "utf-8");
  
  // PGLite can execute multiple statements separated by semicolon 
  // but it's safer to split by '--> statement-breakpoint' if needed, or just let it run.
  const statements = sql.split("--> statement-breakpoint");
  for (const stmt of statements) {
    if (stmt.trim()) {
      await client.exec(stmt.trim());
    }
  }

  console.log("Database initialized successfully.");
  process.exit(0);
}

setup().catch(console.error);
