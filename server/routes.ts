import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  app.get(api.items.list.path, async (req, res) => {
    const items = await storage.getItems();
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
  const existing = await storage.getItems();
  if (existing.length === 0) {
    await storage.createItem({
      type: "found",
      description: "Blue water bottle",
      location: "Gym",
      contactName: "Coach Smith",
      contactEmail: "smith@school.edu",
    });
    await storage.createItem({
      type: "lost",
      description: "Math textbook",
      location: "Library",
      contactName: "Jane Doe",
      contactEmail: "jane@student.edu",
    });
  }

  return httpServer;
}
