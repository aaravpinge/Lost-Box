import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";
import { db } from "./db.js";
import { sql } from "drizzle-orm";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAuthorized = origin && (
    origin.includes('web.app') || 
    origin.includes('loca.lt') || 
    origin.includes('pinggy-free.link') || 
    origin.includes('localhost') || 
    origin.includes('vercel.app') || 
    origin.includes('firebaseapp.com')
  );

  if (isAuthorized) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, bypass-tunnel-reminder');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

export const initPromise = (async () => {
  // Sync database schema in production
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    try {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      const path = await import("path");
      const fs = await import("fs");
      
      const cwd = process.cwd();
      const migrationPaths = [
        path.join(cwd, "migrations"),
        path.join(cwd, "api", "migrations"),
        path.join(cwd, "dist", "migrations"),
        path.resolve(cwd, "..", "migrations")
      ];
      
      log(`Checking for migrations in: ${migrationPaths.join(", ")}`);
      
      let migrationDir = "";
      for (const p of migrationPaths) {
        if (fs.existsSync(p)) {
          migrationDir = p;
          log(`Found migrations at: ${p}`);
          break;
        }
      }

      if (migrationDir) {
        log(`Migrating database from ${migrationDir}...`);
        await migrate(db, { migrationsFolder: migrationDir });
        log("Database migration successful!");
      } else {
        log("Warning: No migrations folder found. Schema may be out of date.");
      }

      // Explicitly check/fix missing columns since migration might have been skipped on Vercel
      try {
        await db.execute(sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other'`);
        await db.execute(sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS claimed_by text`);
        log("Schema enforcement: category and claimed_by columns ensured.");
      } catch (err) {
        log(`Schema enforcement info: ${err}`);
      }
    } catch (err) {
      log(`Database migration failed: ${err}`);
    }
  }

  // Force create Admin user
  try {
    const adminEmail = "admin@bwscampus.com";
    const { storage } = await import("./storage.js");
    const adminUser = await storage.getUserByEmail(adminEmail);
    
    // Hash password: 'admin123'
    const crypto = await import("crypto");
    const hashedPassword = crypto.scryptSync("admin123", "salt", 64).toString("hex");

    if (!adminUser) {
      await storage.createUser({
        email: adminEmail,
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        isAdmin: "true",
      });
      log("SECURITY: Admin user 'admin@bwscampus.com' created successfully.");
    } else {
      // Ensure existing admin has the correct password and admin status
      await storage.updateUser(adminUser.id, {
        password: hashedPassword,
        isAdmin: "true"
      });
      log("SECURITY: Admin user 'admin@bwscampus.com' confirmed and password reset to 'admin123'.");
    }
  } catch (err) {
    log(`Warning: Admin initialization error: ${err}`);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite.js");
    await setupVite(httpServer, app);
  }

  if (!process.env.VERCEL) {
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      { port, host: "0.0.0.0" },
      () => log(`serving on port ${port}`)
    );
  }
})();

export default app;
