import { z } from 'zod';
import { insertItemSchema, items, users } from './schema.js';

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
};

export const api = {
  items: {
    list: {
      method: 'GET' as const,
      path: '/api/items',
      input: z.object({
        type: z.enum(['lost', 'found']).optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof items.$inferSelect>()),
      },
    },

    get: {
      method: 'GET' as const,
      path: '/api/items/:id',
      responses: {
        200: z.custom<typeof items.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },

    create: {
      method: 'POST' as const,
      path: '/api/items',
      input: insertItemSchema,
      responses: {
        201: z.custom<typeof items.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },

    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/items/:id/status',
      input: z.object({
        status: z.enum([
          'reported',
          'retrieved',
          'donated',
          'claimed',
          'pending_verification',
          'verified',
          'resolved',
        ]).optional(),

        claimedBy: z.string().optional(),
      }),

      responses: {
        200: z.custom<typeof items.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },

    // Submit a claim for a found item.
    claim: {
      method: 'POST' as const,
      path: '/api/items/:id/claim',

      input: z.object({
        claimantName: z.string().optional(),
        claimantEmail: z.string().optional(),

        answers: z.array(
          z.object({
            q: z.string(),
            a: z.string(),
          })
        ).optional(),
      }).optional(),

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
      method: 'DELETE' as const,
      path: '/api/items/:id',

      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // Claims / verification workflow.
  claims: {
    list: {
      method: 'GET' as const,
      path: '/api/claims',

      responses: {
        200: z.array(z.any()),
        401: errorSchemas.validation,
        403: errorSchemas.validation,
      },
    },

    byItem: {
      method: 'GET' as const,
      path: '/api/items/:id/claims',

      responses: {
        200: z.array(z.any()),
        401: errorSchemas.validation,
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },

    get: {
      method: 'GET' as const,
      path: '/api/claims/:id',

      responses: {
        200: z.any(),
        401: errorSchemas.validation,
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },

    review: {
      method: 'POST' as const,
      path: '/api/claims/:id/review',

      input: z.object({
        action: z.enum(['accept', 'reject']),
        notes: z.string().optional(),
      }),

      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.validation,
        403: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },

  user: {
    me: {
      method: 'GET' as const,
      path: '/api/user/me',

      responses: {
        200: z.custom<typeof users.$inferSelect>().nullable(),
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  // If we are on Firebase Hosting (static), proxy requests
  // to a stable local tunnel.
  const isFirebase =
    typeof window !== 'undefined' &&
    (
      window.location.hostname.includes('web.app') ||
      window.location.hostname.includes('firebaseapp.com')
    );

  const baseUrl = isFirebase
    ? 'https://8e2fc305eb48e78e-172-250-5-58.serveousercontent.com'
    : '';

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
