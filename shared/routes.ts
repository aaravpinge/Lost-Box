import { z } from "zod";
import {
  insertItemSchema,
  items,
  users,
  claims,
} from "./schema.js";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),

  notFound: z.object({
    message: z.string(),
  }),

  internal: z.object({
    message: z.string(),
  }),

  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  items: {
    list: {
      method: "GET" as const,
      path: "/api/items",
      input: z
        .object({
          type: z.enum(["lost", "found"]).optional(),
          search: z.string().optional(),
        })
        .optional(),

      responses: {
        200: z.array(z.custom<typeof items.$inferSelect>()),
      },
    },

    get: {
      method: "GET" as const,
      path: "/api/items/:id",

      responses: {
        200: z.custom<typeof items.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },

    create: {
      method: "POST" as const,
      path: "/api/items",

      input: insertItemSchema,

      responses: {
        201: z.custom<typeof items.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },

    updateStatus: {
      method: "PATCH" as const,
      path: "/api/items/:id/status",

      input: z.object({
        status: z
          .enum([
            "reported",
            "retrieved",
            "donated",
            "claimed",
            "pending_verification",
            "verified",
            "resolved",
          ])
          .optional(),

        claimedBy: z.string().optional(),
      }),

      responses: {
        200: z.custom<typeof items.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },

    // Submit a claim for a found item.
    // Verification is enforced by the server before
    // this endpoint creates a claim.
    claim: {
      method: "POST" as const,
      path: "/api/items/:id/claim",

      input: z
        .object({
          claimantName: z.string().optional(),
          claimantEmail: z.string().optional(),

          answers: z
            .array(
              z.object({
                q: z.string(),
                a: z.string(),
              })
            )
            .optional(),
        })
        .optional(),

      responses: {
        201: z.object({
          claimId: z.number(),
          matchScore: z.number(),
          message: z.string(),
        }),

        400: errorSchemas.validation,

        404: errorSchemas.notFound,
      },
    },

    delete: {
      method: "DELETE" as const,
      path: "/api/items/:id",

      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },

  // ---------------------------------------------------------
  // CLAIM MANAGEMENT
  // ---------------------------------------------------------

  claims: {
    // Get every claim for an item.
    // Used by the admin dashboard to see who actually submitted
    // a claim and the current claim status.
    forItem: {
      method: "GET" as const,
      path: "/api/items/:id/claims",

      responses: {
        200: z.array(z.custom<typeof claims.$inferSelect>()),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },

    // Get one claim by ID.
    get: {
      method: "GET" as const,
      path: "/api/claims/:id",

      responses: {
        200: z.custom<typeof claims.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },

    // Staff/admin review of a claim.
    review: {
      method: "POST" as const,
      path: "/api/claims/:id/review",

      input: z.object({
        action: z.enum(["accept", "reject"]),
        notes: z.string().optional(),

        // When accepting a claim, this can be used to move
        // the item into its final status.
        setStatus: z
          .enum([
            "reported",
            "retrieved",
            "donated",
            "claimed",
            "pending_verification",
            "verified",
            "resolved",
          ])
          .optional(),
      }),

      responses: {
        200: z.custom<typeof claims.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },

  user: {
    me: {
      method: "GET" as const,
      path: "/api/user/me",

      responses: {
        200: z
          .custom<typeof users.$inferSelect>()
          .nullable(),

        401: z.string(),
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  // If we are on Firebase Hosting (static), proxy requests
  // to the backend tunnel.
  const isFirebase =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("web.app") ||
      window.location.hostname.includes("firebaseapp.com"));

  const baseUrl = isFirebase
    ? "https://8e2fc305eb48e78e-172-250-5-58.serveousercontent.com"
    : "";

  let url = baseUrl + path;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }

  return url;
}

export type Item =
  z.infer<typeof api.items.list.responses[200]>[number];
