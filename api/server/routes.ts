import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage.js";
import { api } from "../../shared/routes.js";
import { z } from "zod";
import { setupAuth } from "./auth.js";
import { registerUploadRoutes } from "./uploads.js";
import {
  sendItemNotification,
  sendMatchNotification,
  sendExpiryAlert,
} from "./email.js";
import { log } from "./index.js";
import { verifyAnswer } from "./crypto.js";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  registerUploadRoutes(app);

  app.get(api.items.list.path, async (req, res) => {
    const { type, search } = req.query;

    const items = await storage.getItems(
      type as string,
      search as string
    );

    res.json(items);
  });

  app.get(api.items.get.path, async (req, res) => {
    const item = await storage.getItem(Number(req.params.id));

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    // redact privateFields before returning to public callers
    const out = { ...item } as any;
    delete out.privateFields;
    res.json(out);
  });
  // Consolidated: Return public verification questions for a found item.
  // Never return the stored answers or answer hashes.
  app.get("/api/items/:id/verification-questions", async (req, res) => {
    try {
      const itemId = Number(req.params.id);

      if (!Number.isInteger(itemId)) {
        return res.status(400).json({
          message: "Invalid item ID",
        });
      }

      const item = await storage.getItem(itemId);

      if (!item) {
        return res.status(404).json({
          message: "Item not found",
        });
      }

      if (item.type !== "found") {
        return res.status(400).json({
          message: "Verification questions are only available for found items",
        });
      }

      const privateFields = (item as any).privateFields;

      const verificationQuestions =
        privateFields &&
        Array.isArray(privateFields.verificationQuestions)
          ? privateFields.verificationQuestions
              .filter(
                (question: any) =>
                  question &&
                  typeof question.q === "string" &&
                  question.q.trim().length > 0
              )
              .map((question: any) => ({
                q: question.q.trim(),
              }))
          : [];

      return res.json(verificationQuestions);
    } catch (err: any) {
      log(`GET /api/items/:id/verification-questions error: ${err?.message || err}`);

      return res.status(500).json({
        message: "Could not load verification questions",
      });
    }
  });
  // Submit a claim for a found item
  app.post(api.items.claim.path, async (req, res) => {
    try {
      const itemId = Number(req.params.id);

      if (!Number.isInteger(itemId)) {
        return res.status(400).json({
          message: "Invalid item ID",
        });
      }

      const item = await storage.getItem(itemId);

      if (!item) {
        return res.status(404).json({
          message: "Item not found",
        });
      }

      if (item.type !== "found") {
        return res.status(400).json({
          message: "Only found items can be claimed",
        });
      }

      if (
        item.status !== "reported" &&
        item.status !== "pending_verification"
      ) {
        return res.status(400).json({
          message: "This item is not currently available for claiming",
        });
      }

      const input = api.items.claim.input?.parse(req.body ?? {});

      const claimantName =
        typeof input?.claimantName === "string"
          ? input.claimantName.trim()
          : undefined;

      const claimantEmail =
        typeof input?.claimantEmail === "string"
          ? input.claimantEmail.trim()
          : undefined;

      const answers = Array.isArray(input?.answers)
        ? input.answers
            .filter(
              (answer) =>
                typeof answer.q === "string" &&
                typeof answer.a === "string" &&
                answer.q.trim().length > 0 &&
                answer.a.trim().length > 0
            )
            .map((answer) => ({
              q: answer.q.trim(),
              a: answer.a.trim(),
            }))
        : [];

      if (answers.length === 0) {
        return res.status(400).json({
          message: "Please provide identifying details",
        });
      }

      // If the item has stored verification questions, require verification-first
      const storedVerification = (item as any).privateFields?.verificationQuestions ?? [];

      if (Array.isArray(storedVerification) && storedVerification.length > 0) {
        // Require answers for every stored question
        for (const sq of storedVerification) {
          const storedQ = typeof sq.q === "string" ? sq.q.trim() : "";
          if (!storedQ) continue;
          const provided = answers.find((a) => a.q.trim() === storedQ);
          if (!provided) {
            return res.status(400).json({ message: "Please answer all verification questions" });
          }
          if (!verifyAnswer(provided.a, sq.aHash)) {
            // wrong answer: do not create a claim and do not change item status
            return res.status(400).json({ message: "Verification failed" });
          }
        }

        // All verification answers matched. Create a single claim with status 'pending'
        // and do NOT store claimant-provided verification answers.
        const claim = await storage.createClaim(itemId, claimantName, claimantEmail, null, 0);

        // Set item status to pending_verification (do not mark as claimed)
        await storage.updateItemStatus(itemId, "pending_verification");

        return res.status(201).json({
          claimId: claim.id,
          matchScore: 0,
          message: "Claim submitted successfully. Staff will review your claim.",
        });
      } else {
        // No stored verification questions: preserve existing fallback behavior
        const claim = await storage.createClaim(itemId, claimantName, claimantEmail, answers, 0);

        return res.status(201).json({
          claimId: claim.id,
          matchScore: 0,
          message: "Claim submitted successfully. Staff will review your claim.",
        });
      }
    } catch (err: any) {
      log(`POST /api/items/:id/claim error: ${err.message}`);

      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0]?.message || "Invalid claim data",
          field: err.errors[0]?.path?.join("."),
        });
      }

      return res.status(500).json({
        message: "Could not submit claim",
      });
    }
  });

  app.post(api.items.create.path, async (req, res) => {
    try {
      log(
        `POST /api/items - Received data: ${JSON.stringify(req.body)}`
      );

      const input = api.items.create.input.parse(req.body);

      log(`POST /api/items - Validation successful`);

      const item = await storage.createItem(input);

      log(
        `POST /api/items - Database insert successful: ID ${item.id}`
      );

      // Trigger Intelligent Auto-Matching
      try {
        const matches = await storage.findPotentialMatches(item);

        if (matches.length > 0) {
          sendMatchNotification(item, matches).catch((err) =>
            log(`Match Notification Error: ${err}`)
          );
        }
      } catch (matchErr) {
        log(`Matching logic error (continuing): ${matchErr}`);
      }

      // Fire and forget email notification
      sendItemNotification(item).catch((err) =>
        log(`Notification Error: ${err}`)
      );

      res.status(201).json(item);
    } catch (err: any) {
      log(
        `POST /api/items - CRITICAL ERROR: ${err.message}`
      );

      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }

      res.status(500).json({
        message: "Internal Server Error",
        details: err.message,
        stack:
          process.env.NODE_ENV === "development"
            ? err.stack
            : undefined,
      });
    }
  });

  app.get("/api/stats", async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.patch(api.items.updateStatus.path, async (req, res) => {
    try {
      const { status, claimedBy } = req.body;

      const item = await storage.updateItemStatus(
        Number(req.params.id),
        status,
        claimedBy
      );

      if (!item) {
        return res.status(404).json({
          message: "Item not found",
        });
      }

      res.json(item);
    } catch (err) {
      res.status(400).json({
        message: "Invalid status",
      });
    }
  });

  app.delete(api.items.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    await storage.deleteItem(Number(req.params.id));

    res.status(204).send();
  });

  // Seed data
  try {
    const existing = await storage.getItems();

    if (existing.length === 0) {
      log("Seeding initial sample data...");

      await storage.createItem({
        type: "found",
        description: "Blue water bottle",
        location: "Gym",
        contactName: "Coach Smith",
        contactEmail: "smith@bwscampus.com",
        dateFound: new Date().toISOString(),
        dateLost: null,
        category: "Water Bottles",
      });

      await storage.createItem({
        type: "lost",
        description: "Math textbook",
        location: "Library",
        contactName: "Jane Doe",
        contactEmail: "jane@bwscampus.com",
        dateLost: new Date().toISOString(),
        dateFound: null,
        category: "Books",
      });
    }
  } catch (err) {
    log(
      `Warning: Initial data seeding skipped: ${err}`
    );
  }

  // Seed admin user
  try {
    const adminEmail = "admin@bwscampus.com";

    const adminUser =
      await storage.getUserByEmail(adminEmail);

    const crypto = await import("crypto");

    const hashedPassword = crypto
      .scryptSync("admin123", "salt", 64)
      .toString("hex");

    if (!adminUser) {
      await storage.createUser({
        email: adminEmail,
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        isAdmin: "true",
      });

      log(
        "Admin user created: admin@bwscampus.com / admin123"
      );
    } else if (
      !adminUser.password ||
      adminUser.isAdmin !== "true"
    ) {
      await storage.updateUser(adminUser.id, {
        password: hashedPassword,
        isAdmin: "true",
      });

      log(
        "Admin user updated: admin@bwscampus.com / admin123"
      );
    }
  } catch (err) {
    log(
      `Warning: Admin user initialization skipped: ${err}`
    );
  }

  // Setup Smart Expiry & Donation Alerts (Daily check)
  if (!process.env.VERCEL) {
    setInterval(async () => {
      try {
        const expiredItems =
          await storage.getExpiredItems(30);

        if (expiredItems.length > 0) {
          sendExpiryAlert(expiredItems);
        }
      } catch (err) {
        console.error("Expiry Alert Error:", err);
      }
    }, 1000 * 60 * 60 * 24);
  }

  // Initial check on startup
  storage
    .getExpiredItems(30)
    .then((items) => {
      if (items.length > 0) {
        sendExpiryAlert(items);
      }
    })
    .catch((err) =>
      console.error("Initial Expiry Check Error:", err)
    );

  // Health Check Endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const { items } =
        await import("../../shared/schema.js");
      const { db } = await import("./db.js");

      const result = await db
        .select()
        .from(items)
        .limit(1);

      res.json({
        status: "connected",
        database: "Vercel Postgres / Neon",
        itemCount: result.length,
        migrationStatus:
          "Success (Items table found)",
      });
    } catch (err: any) {
      log(
        `Health Check Failed: ${err.message}`
      );

      res.status(500).json({
        status: "error",
        message: err.message,
        stack: err.stack,
        hint:
          "Check your POSTGRES_URL and ensure the migrations have run.",
      });
    }
  });

  return httpServer;
}
