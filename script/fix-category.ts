import { PGlite } from "@electric-sql/pglite";
async function run() {
  const client = new PGlite({ dataDir: "./.local/pglite" });
  try {
    await client.query(`ALTER TABLE items ADD COLUMN category text NOT NULL DEFAULT 'Other';`);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration error:", err);
  }
  process.exit(0);
}
run();
