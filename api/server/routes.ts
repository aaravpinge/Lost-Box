import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "../../shared/routes";
import { z } from "zod";
import { setupAuth } from "./auth";
import { registerUploadRoutes } from "./uploads";
import { sendItemNotification, sendMatchNotification, sendExpiryAlert } from "./email";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  registerUploadRoutes(app);

  app.get(api.items.list.path, async (req, res) => {
    const { type, search } = req.query;
    let items = await storage.getItems(type as string, search as string);
    res.json(items);
  });

  app.get(api.items.get.path, async (req, res) => {
    const item = await storage.getItem(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  });

  app.post(api.items.create.path, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      const item = await storage.createItem(input);

      // Trigger Intelligent Auto-Matching
      const matches = await storage.findPotentialMatches(item);
      if (matches.length > 0) {
        sendMatchNotification(item, matches).catch(err => console.error("Match Notification Error:", err));
      }

      // Fire and forget email notification
      sendItemNotification(item).catch(err => console.error("Notification Error:", err));

      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get("/api/stats", async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.patch(api.items.updateStatus.path, async (req, res) => {
    try {
      const { status, claimedBy } = req.body;
      const item = await storage.updateItemStatus(Number(req.params.id), status, claimedBy);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid status" });
    }
  });

  app.delete(api.items.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
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
        category: "Water Bottles"
      });
      await storage.createItem({
        type: "lost",
        description: "Math textbook",
        location: "Library",
        contactName: "Jane Doe",
        contactEmail: "jane@bwscampus.com",
        dateLost: new Date().toISOString(),
        dateFound: null,
        category: "Books"
      });
    }
  } catch (err) {
    log(`Warning: Initial data seeding skipped: ${err}`);
  }

  // Seed admin user
  try {
    const adminEmail = "admin@bwscampus.com";
    const adminUser = await storage.getUserByEmail(adminEmail);
    const crypto = await import("crypto");
    const hashedPassword = crypto.scryptSync("admin123", "salt", 64).toString("hex");

    if (!adminUser) {
      await storage.createUser({
        email: adminEmail,
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        isAdmin: "true",
      });
      log("Admin user created: admin@bwscampus.com / admin123");
    } else if (!adminUser.password || adminUser.isAdmin !== "true") {
      await storage.updateUser(adminUser.id, {
        password: hashedPassword,
        isAdmin: "true"
      });
      log("Admin user updated: admin@bwscampus.com / admin123");
    }
  } catch (err) {
    log(`Warning: Admin user initialization skipped: ${err}`);
  }

  // Setup Smart Expiry & Donation Alerts (Daily check)
  setInterval(async () => {
    try {
      const expiredItems = await storage.getExpiredItems(30);
      if (expiredItems.length > 0) {
        sendExpiryAlert(expiredItems);
      }
    } catch (err) {
      console.error("Expiry Alert Error:", err);
    }
  }, 1000 * 60 * 60 * 24); // Every 24 hours

  // Initial check on startup
  storage.getExpiredItems(30).then(items => {
    if (items.length > 0) sendExpiryAlert(items);
  }).catch(err => console.error("Initial Expiry Check Error:", err));

  return httpServer;
}
