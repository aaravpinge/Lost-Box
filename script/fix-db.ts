import { PGlite } from "@electric-sql/pglite";

async function fixDb() {
    const client = new PGlite({
        dataDir: "./.local/pglite"
    });

    try {
        console.log("Adding password column to users table...");
        await client.exec('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text;');
        console.log("Database schema fixed.");
    } catch (err) {
        console.error("Error fixing database:", err);
    } finally {
        process.exit(0);
    }
}

fixDb();
