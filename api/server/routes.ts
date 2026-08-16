
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

  // ============================================================
  // ITEMS
  // ============================================================

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

    // Never expose private verification information publicly.
    const out = { ...item } as any;
    delete out.privateFields;

    res.json(out);
  });

  // ============================================================
  // VERIFICATION QUESTIONS
  // ============================================================

  // Return public verification questions for a found item.
  // Never return stored answers or answer hashes.
  app.get(
    "/api/items/:id/verification-questions",
    async (req, res) => {
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
            message:
              "Verification questions are only available for found items",
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
        log(
          `GET /api/items/:id/verification-questions error: ${
            err?.message || err
          }`
        );

        return res.status(500).json({
          message: "Could not load verification questions",
        });
      }
    }
  );

  // ============================================================
  // CLAIM SUBMISSION
  // ============================================================

  // Submit a claim for a found item.
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

      // An item can be claimed if it is reported, or if it is
      // pending verification and has no existing claims.
      if (
        item.status !== "reported" &&
        !(
          item.status === "pending_verification" &&
          (await storage.getClaimsForItem(itemId)).length === 0
        )
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

      // Require claimant name.
      if (!claimantName) {
        return res.status(400).json({
          message: "Please provide your name",
          field: "claimantName",
        });
      }

      // Require claimant email.
      if (!claimantEmail) {
        return res.status(400).json({
          message: "Please provide your email",
          field: "claimantEmail",
        });
      }

      // Only allow approved Birmingham Charter school email domains.
      const allowedSchoolEmail =
        /^[^\s@]+@(stu\.birminghamcharter\.com|bcchs\.net)$/i;

      if (!allowedSchoolEmail.test(claimantEmail)) {
        return res.status(400).json({
          message:
            "Please use your Birmingham Charter school email (@stu.birminghamcharter.com or @bcchs.net)",
          field: "claimantEmail",
        });
      }

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

      // ========================================================
      // OWNER VERIFICATION
      // ========================================================

      const storedVerification =
        (item as any).privateFields?.verificationQuestions ?? [];

      const hasVerificationQuestions =
        Array.isArray(storedVerification) &&
        storedVerification.some(
          (question: any) =>
            question &&
            typeof question.q === "string" &&
            question.q.trim().length > 0
        );

      // ========================================================
      // CASE 1:
      // FINDER CREATED VERIFICATION QUESTIONS
      // ========================================================

      if (hasVerificationQuestions) {
        // The claimant must answer every verification question.
        if (answers.length === 0) {
          return res.status(400).json({
            message: "Please answer all verification questions",
          });
        }

        for (const sq of storedVerification) {
          const storedQ =
            typeof sq.q === "string" ? sq.q.trim() : "";

          if (!storedQ) {
            continue;
          }

          const provided = answers.find(
            (a) => a.q.trim() === storedQ
          );

          if (!provided) {
            return res.status(400).json({
              message: "Please answer all verification questions",
            });
          }

          // IMPORTANT:
          // A wrong answer immediately stops the claim.
          // No claim is created.
          // Item status is not changed.
          if (!verifyAnswer(provided.a, sq.aHash)) {
            return res.status(400).json({
              message: "Verification failed",
            });
          }
        }

        // All answers passed verification.
        // Create a pending claim.
        // Do NOT store the private answers.
        const claim = await storage.createClaim(
          itemId,
          claimantName,
          claimantEmail,
          null,
          0
        );

        // Keep the item pending until an admin reviews the claim.
        await storage.updateItemStatus(
          itemId,
          "pending_verification"
        );

        return res.status(201).json({
          claimId: claim.id,
          matchScore: 0,
          message:
            "Claim submitted successfully. Staff will review your claim.",
        });
      }

      // ========================================================
      // CASE 2:
      // FINDER DID NOT CREATE VERIFICATION QUESTIONS
      // ========================================================
      //
      // The claimant is still allowed to submit a claim.
      //
      // Because there are no private verification questions,
      // the system cannot automatically verify ownership.
      //
      // The claim is therefore sent to the admin for MANUAL
      // verification before the item is released.
      //

      const claim = await storage.createClaim(
        itemId,
        claimantName,
        claimantEmail,
        answers.length > 0 ? answers : null,
        0,
        "manual_verification"
      );

      // Keep the item in the pending state while staff manually
      // verifies that the claimant is the legitimate owner.
      await storage.updateItemStatus(
        itemId,
        "pending_verification"
      );

      return res.status(201).json({
        claimId: claim.id,
        matchScore: 0,
        manualVerification: true,
        message:
          "Claim submitted successfully. Staff must manually verify ownership before releasing the item.",
      });
    } catch (err: any) {
      log(
        `POST /api/items/:id/claim error: ${err.message}`
      );

      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message:
            err.errors[0]?.message || "Invalid claim data",
          field: err.errors[0]?.path?.join("."),
        });
      }

      return res.status(500).json({
        message: "Could not submit claim",
      });
    }
  });

  // ============================================================
  // ADMIN CLAIM REVIEW
  // ============================================================

  // ------------------------------------------------------------
  // GET ALL PENDING CLAIMS
  // ------------------------------------------------------------
  //
  // GET /api/claims
  //
  // Only authenticated administrators can access this endpoint.
  //
  app.get("/api/claims", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      const user = req.user as any;

      if (user?.isAdmin !== "true") {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      // Get all found items.
      const foundItems = await storage.getItems("found");

      // Look for pending claims associated with those items.
      const pendingClaims: any[] = [];

      for (const item of foundItems) {
        const claims = await storage.getClaimsForItem(item.id);

        for (const claim of claims) {
          if (
            claim.status === "pending" ||
            claim.status === "manual_verification"
          ) {
            pendingClaims.push({
              ...claim,

              // Include safe item information for the admin UI.
              // privateFields are never included.
              item: {
                id: item.id,
                type: item.type,
                description: item.description,
                category: item.category,
                location: item.location,
                dateReported: item.dateReported,
                dateFound: item.dateFound,
                status: item.status,
                publicFields: item.publicFields,
              },
            });
          }
        }
      }

      // Newest claims first.
      pendingClaims.sort((a, b) => {
        const aDate = new Date(
          a.created_at || 0
        ).getTime();

        const bDate = new Date(
          b.created_at || 0
        ).getTime();

        return bDate - aDate;
      });

      return res.json(pendingClaims);
    } catch (err: any) {
      log(
        `GET /api/claims error: ${
          err?.message || err
        }`
      );

      return res.status(500).json({
        message: "Could not load pending claims",
      });
    }
  });

  // ------------------------------------------------------------
  // GET CLAIMS FOR ONE ITEM
  // ------------------------------------------------------------

  app.get(
    "/api/items/:id/claims",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({
            message: "Unauthorized",
          });
        }

        const user = req.user as any;

        if (user?.isAdmin !== "true") {
          return res.status(403).json({
            message: "Admin access required",
          });
        }

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

        const claims =
          await storage.getClaimsForItem(itemId);

        return res.json(claims);
      } catch (err: any) {
        log(
          `GET /api/items/:id/claims error: ${
            err?.message || err
          }`
        );

        return res.status(500).json({
          message: "Could not load claims",
        });
      }
    }
  );

  // ------------------------------------------------------------
  // REVIEW CLAIM
  // ------------------------------------------------------------

  // Approve:
  //   claim -> accepted
  //   item  -> claimed
  //
  // Reject:
  //   claim -> rejected
  //   item  -> pending_verification
  //
  app.post(
    "/api/claims/:id/review",
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({
            message: "Unauthorized",
          });
        }

        const user = req.user as any;

        if (user?.isAdmin !== "true") {
          return res.status(403).json({
            message: "Admin access required",
          });
        }

        const claimId = Number(req.params.id);
        const { action, notes } = req.body ?? {};

        if (!Number.isInteger(claimId)) {
          return res.status(400).json({
            message: "Invalid claim ID",
          });
        }

        if (
          action !== "accept" &&
          action !== "reject"
        ) {
          return res.status(400).json({
            message:
              "Action must be accept or reject",
          });
        }

        const claim =
          await storage.getClaimById(claimId);

        if (!claim) {
          return res.status(404).json({
            message: "Claim not found",
          });
        }

        if (claim.status !== "pending") {
          return res.status(400).json({
            message:
              "This claim has already been reviewed",
          });
        }

        const result =
          await storage.reviewClaim(
            claimId,
            user.email || user.id || "admin",
            action,
            typeof notes === "string"
              ? notes
              : undefined,
            action === "accept"
              ? "claimed"
              : "pending_verification"
          );

        return res.json(result);
      } catch (err: any) {
        log(
          `POST /api/claims/:id/review error: ${
            err?.message || err
          }`
        );

        return res.status(500).json({
          message: "Could not review claim",
        });
      }
    }
  );

  // ============================================================
  // CREATE ITEM
  // ============================================================

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
          api.items.create.input.parse(req.body);

        log(
          `POST /api/items - Validation successful`
        );

        const item =
          await storage.createItem(input);

        log(
          `POST /api/items - Database insert successful: ID ${item.id}`
        );

        // Intelligent auto-matching.
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
            `Matching logic error (continuing): ${matchErr}`
          );
        }

        // Fire-and-forget email notification.
        sendItemNotification(item).catch(
          (err) =>
            log(
              `Notification Error: ${err}`
            )
        );

        res.status(201).json(item);
      } catch (err: any) {
        log(
          `POST /api/items - CRITICAL ERROR: ${err.message}`
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
          stack:
            process.env.NODE_ENV ===
            "development"
              ? err.stack
              : undefined,
        });
      }
    }
  );

  // ============================================================
  // STATS
  // ============================================================

  app.get("/api/stats", async (req, res) => {
    const stats =
      await storage.getStats();

    res.json(stats);
  });

  // ============================================================
  // UPDATE ITEM STATUS
  // ============================================================

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
      } catch (err) {
        res.status(400).json({
          message: "Invalid status",
        });
      }
    }
  );

  // ============================================================
  // DELETE ITEM
  // ============================================================

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

  // ============================================================
  // SEED ADMIN USER
  // ============================================================

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
        "Admin user created: admin@bwcampus.com / admin123"
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
        "Admin user updated: admin@bwcampus.com / admin123"
      );
    }
  } catch (err) {
    log(
      `Warning: Admin user initialization skipped: ${err}`
    );
  }

  // ============================================================
  // SMART EXPIRY / DONATION ALERTS
  // ============================================================

  if (!process.env.VERCEL) {
    setInterval(
      async () => {
        try {
          const expiredItems =
            await storage.getExpiredItems(
              30
            );

          if (
            expiredItems.length > 0
          ) {
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
      },
      1000 * 60 * 60 * 24
    );
  }

  // Initial expiry check on startup.
  storage
    .getExpiredItems(30)
    .then((items) => {
      if (items.length > 0) {
        sendExpiryAlert(items);
      }
    })
    .catch((err) =>
      console.error(
        "Initial Expiry Check Error:",
        err
      )
    );

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  app.get(
    "/api/health",
    async (req, res) => {
      try {
        const { items } =
          await import(
            "../../shared/schema.js"
          );

        const { db } =
          await import("./db.js");

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
    }
  );

  return httpServer;
}

