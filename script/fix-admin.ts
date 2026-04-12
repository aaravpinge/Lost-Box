import { PGlite } from "@electric-sql/pglite";

async function fixDb() {
    const client = new PGlite({
        dataDir: "./.local/pglite"
    });

    try {
        console.log("Adding is_admin column to users table...");
        await client.exec('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" text DEFAULT \'false\';');
        // Ensure existing user is admin
        await client.exec('UPDATE "users" SET "is_admin" = \'true\' WHERE "email" = \'admin@school.edu\';');
        console.log("Database schema fixed.");
    } catch (err) {
        console.error("Error fixing database:", err);
    } finally {
        process.exit(0);
    }
}

fixDb();
