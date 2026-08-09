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

function generateVerificationQuestions(
  description: string,
  category: string,
  additionalDetails?: string | null
) {
  const text =
    `${description} ${additionalDetails || ""}`
      .toLowerCase();

  const questions: string[] = [];

  if (
    category === "Electronics" ||
    /laptop|computer|dell|macbook|ipad|iphone|tablet|phone/.test(
      text
    )
  ) {
    questions.push(
      "What model or brand is the item?"
    );

    questions.push(
      "What color or physical appearance does it have?"
    );

    questions.push(
      "What identifying sticker, mark, accessory, or feature does it have?"
    );

    return questions;
  }

  if (category === "Books") {
    questions.push(
      "What is the title of the book?"
    );

    questions.push(
      "Who is the author?"
    );

    questions.push(
      "What edition, markings, or identifying feature does it have?"
    );

    return questions;
  }

  if (category === "Clothing") {
    questions.push(
      "What type and color is the clothing?"
    );

    questions.push(
      "What size is it?"
    );

    questions.push(
      "What brand, logo, pattern, or identifying feature does it have?"
    );

    return questions;
  }

  if (category === "Water Bottles") {
    questions.push(
      "What brand and color is the bottle?"
    );

    questions.push(
      "What size or shape is it?"
    );

    questions.push(
      "Does it have any stickers, markings, or accessories?"
    );

    return questions;
  }

  if (category === "Keys") {
    questions.push(
      "How many keys are on the key ring?"
    );

    questions.push(
      "What does the keychain or key ring look like?"
    );

    questions.push(
      "Is there any other identifying feature?"
    );

    return questions;
  }

  questions.push(
    "What color, size, or appearance does the item have?"
  );

  questions.push(
    "Where and approximately when did you lose this item?"
  );

  questions.push(
    "What unique identifying feature does the item have?"
  );

  return questions;
}

function ensureVerificationQuestions(
  item: any
) {
  if (item.type !== "found") {
    return item;
  }

  const existing =
    item.privateFields;

  if (
    existing &&
    Array.isArray(
      existing.verificationQuestions
    ) &&
    existing.verificationQuestions.length > 0
  ) {
    return item;
  }

  const questions =
    generateVerificationQuestions(
      item.description,
      item.category,
      item.additionalDetails
    );

  item.privateFields = {
    ...(existing || {}),
    verificationQuestions:
      questions.map((q) => ({
        q,
      })),
  };

  return item;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  registerUploadRoutes(app);

  app.get(
    api.items.list.path,
    async (req, res) => {
      try {
        const {
          type,
          search,
        } = req.query;

        const foundItems =
          await storage.getItems(
            type as string,
            search as string
          );

        // Never expose private verification
        // information through the list endpoint.
        const safeItems =
          foundItems.map((item: any) => {
            const copy = {
              ...item,
            };

            delete copy.privateFields;

            return copy;
          });

        res.json(safeItems);
      } catch (err: any) {
        log(
          `GET /api/items error: ${err}`
        );

        res.status(500).json({
          message:
            "Failed to retrieve items",
        });
      }
    }
  );

  app.get(
    api.items.get.path,
    async (req, res) => {
      const item =
        await storage.getItem(
          Number(req.params.id)
        );

      if (!item) {
        return res.status(404).json({
          message: "Item not found",
        });
      }

      const out: any = {
        ...item,
      };

      delete out.privateFields;

      return res.json(out);
    }
  );

  /*
   * Returns verification QUESTIONS only.
   *
   * The actual privateFields are never returned.
   *
   * For old items that don't have questions,
   * questions are generated automatically.
   */
  app.get(
    "/api/items/:id/verification-questions",
    async (req, res) => {
      try {
        const item =
          await storage.getItem(
            Number(req.params.id)
          );

        if (!item) {
          return res.status(404).json({
            message: "Item not found",
          });
        }

        if (item.type !== "found") {
          return res.json([]);
        }

        const updated =
          ensureVerificationQuestions(
            item
          );

        const questions =
          updated.privateFields
            ?.verificationQuestions || [];

        return res.json(
          questions.map((q: any) => ({
            q: String(q.q),
          }))
        );
      } catch (err: any) {
        log(
          `Verification questions error: ${err}`
        );

        return res.status(500).json({
          message:
            "Internal Server Error",
        });
      }
    }
  );

  /*
   * Create item
   */
  app.post(
    api.items.create.path,
    async (req, res) => {
      try {
        log(
          `POST /api/items - Received data: ${JSON.stringify(
            req.body
          )}`
        );

        const input =
          api.items.create.input.parse(
            req.body
          );

        let privateFields:
          | any
          | undefined;

        /*
         * Every NEW found item gets
         * verification questions.
         */
        if (input.type === "found") {
          const questions =
            generateVerificationQuestions(
              input.description,
              input.category,
              input.additionalDetails
            );

          privateFields = {
            verificationQuestions:
              questions.map((q) => ({
                q,
              })),
          };
        }

        const item =
          await storage.createItem({
            ...input,
            privateFields,
          });

        log(
          `POST /api/items - Database insert successful: ID ${item.id}`
        );

        try {
          const matches =
            await storage.findPotentialMatches(
              item
            );

          if (matches.length > 0) {
            sendMatchNotification(
              item,
              matches
            ).catch((err) =>
              log(
                `Match Notification Error: ${err}`
              )
            );
          }
        } catch (matchErr) {
          log(
            `Matching logic error: ${matchErr}`
          );
        }

        sendItemNotification(item).catch(
          (err) =>
            log(
              `Notification Error: ${err}`
            )
        );

        // Never return privateFields.
        const safeItem: any = {
          ...item,
        };

        delete safeItem.privateFields;

        res.status(201).json(
          safeItem
        );
      } catch (err: any) {
        log(
          `POST /api/items - ERROR: ${err.message}`
        );

        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message:
              err.errors[0].message,
            field:
              err.errors[0].path.join("."),
          });
        }

        res.status(500).json({
          message:
            "Internal Server Error",
          details: err.message,
        });
      }
    }
  );

  /*
   * Submit claim
   *
   * This does NOT automatically mark the item
   * as claimed. The claim is sent for review.
   */
  app.post(
    "/api/items/:id/claim",
    async (req, res) => {
      try {
        const item =
          await storage.getItem(
            Number(req.params.id)
          );

        if (!item) {
          return res.status(404).json({
            message: "Item not found",
          });
        }

        if (item.type !== "found") {
          return res.status(400).json({
            message:
              "Only found items can be claimed.",
          });
        }

        if (item.status !== "reported") {
          return res.status(400).json({
            message:
              "This item is no longer available to claim.",
          });
        }

        const body = req.body || {};

        const claimantName =
          typeof body.claimantName ===
          "string"
            ? body.claimantName.trim()
            : "";

        const claimantEmail =
          typeof body.claimantEmail ===
          "string"
            ? body.claimantEmail.trim()
            : "";

        const answers =
          Array.isArray(body.answers)
            ? body.answers
            : [];

        if (answers.length === 0) {
          return res.status(400).json({
            message:
              "Please provide identifying information.",
          });
        }

        const cleanedAnswers =
          answers.map((answer: any) => ({
            q: String(
              answer?.q || ""
            ).slice(0, 500),

            a: String(
              answer?.a || ""
            )
              .trim()
              .slice(0, 2000),
          }));

        const hasAnswer =
          cleanedAnswers.some(
            (answer: any) =>
              answer.a.length > 0
          );

        if (!hasAnswer) {
          return res.status(400).json({
            message:
              "Please answer at least one verification question.",
          });
        }

        /*
         * For now, claims are logged so staff
         * can review them.
         *
         * We deliberately DO NOT expose privateFields
         * to the claimant.
         */
        log(
          `CLAIM SUBMITTED - Item ${item.id} - Name: ${
            claimantName || "(not provided)"
          } - Email: ${
            claimantEmail || "(not provided)"
          } - Answers: ${JSON.stringify(
            cleanedAnswers
          )}`
        );

        return res.status(201).json({
          success: true,
          message:
            "Your claim has been submitted for review.",
        });
      } catch (err: any) {
        log(
          `POST /api/items/:id/claim error: ${err}`
        );

        return res.status(500).json({
          message:
            "Unable to submit claim.",
        });
      }
    }
  );

  app.get(
    "/api/stats",
    async (_req, res) => {
      const stats =
        await storage.getStats();

      res.json(stats);
    }
  );

  app.patch(
    api.items.updateStatus.path,
    async (req, res) => {
      try {
        const {
          status,
          claimedBy,
        } = req.body;

        const item =
          await storage.updateItemStatus(
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
      } catch {
        res.status(400).json({
          message: "Invalid status",
        });
      }
    }
  );

  app.delete(
    api.items.delete.path,
    async (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      await storage.deleteItem(
        Number(req.params.id)
      );

      res.status(204).send();
    }
  );

  /*
   * Initial sample data
   */
  try {
    const existing =
      await storage.getItems();

    if (existing.length === 0) {
      log(
        "Seeding initial sample data..."
      );

      const waterBottleQuestions =
        generateVerificationQuestions(
          "Blue water bottle",
          "Water Bottles"
        );

      await storage.createItem({
        type: "found",
        description:
          "Blue water bottle",
        location: "Gym",
        contactName:
          "Coach Smith",
        contactEmail:
          "smith@bwcampus.com",
        dateFound:
          new Date().toISOString(),
        dateLost: null,
        category:
          "Water Bottles",
        privateFields: {
          verificationQuestions:
            waterBottleQuestions.map(
              (q) => ({ q })
            ),
        },
      });

      await storage.createItem({
        type: "lost",
        description:
          "Math textbook",
        location: "Library",
        contactName:
          "Jane Doe",
        contactEmail:
          "jane@bwcampus.com",
        dateLost:
          new Date().toISOString(),
        dateFound: null,
        category: "Books",
      });
    }
  } catch (err) {
    log(
      `Warning: Initial data seeding skipped: ${err}`
    );
  }

  /*
   * Admin user
   */
  try {
    const adminEmail =
      "admin@bwcampus.com";

    const adminUser =
      await storage.getUserByEmail(
        adminEmail
      );

    const crypto =
      await import("crypto");

    const hashedPassword =
      crypto
        .scryptSync(
          "admin123",
          "salt",
          64
        )
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
        "Admin user created."
      );
    } else if (
      !adminUser.password ||
      adminUser.isAdmin !== "true"
    ) {
      await storage.updateUser(
        adminUser.id,
        {
          password:
            hashedPassword,
          isAdmin: "true",
        }
      );

      log(
        "Admin user updated."
      );
    }
  } catch (err) {
    log(
      `Warning: Admin initialization skipped: ${err}`
    );
  }

  /*
   * Expiry alerts
   */
  if (!process.env.VERCEL) {
    setInterval(async () => {
      try {
        const expiredItems =
          await storage.getExpiredItems(
            30
          );

        if (expiredItems.length > 0) {
          sendExpiryAlert(
            expiredItems
          );
        }
      } catch (err) {
        console.error(
          "Expiry Alert Error:",
          err
        );
      }
    }, 1000 * 60 * 60 * 24);
  }

  storage
    .getExpiredItems(30)
    .then((expiredItems) => {
      if (expiredItems.length > 0) {
        sendExpiryAlert(
          expiredItems
        );
      }
    })
    .catch((err) =>
      console.error(
        "Initial Expiry Check Error:",
        err
      )
    );

  /*
   * Health check
   */
  app.get(
    "/api/health",
    async (_req, res) => {
      try {
        const {
          items,
        } = await import(
          "../../shared/schema.js"
        );

        const {
          db,
        } = await import(
          "./db.js"
        );

        const result =
          await db
            .select()
            .from(items)
            .limit(1);

        res.json({
          status: "connected",
          database:
            "Vercel Postgres / Neon",
          itemCount:
            result.length,
          migrationStatus:
            "Success",
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
            "Check your POSTGRES_URL and ensure migrations have run.",
        });
      }
    }
  );

  return httpServer;
}
    
