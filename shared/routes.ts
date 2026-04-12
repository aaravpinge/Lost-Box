import { z } from 'zod';
import { insertItemSchema, items, users } from './schema';

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
        status: z.enum(['reported', 'retrieved', 'donated', 'claimed']),
        claimedBy: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof items.$inferSelect>(),
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
  user: {
    me: {
      method: 'GET' as const,
      path: '/api/user/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>().nullable(),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  // If we are on Firebase Hosting (static), proxy requests to a stable local tunnel
  const isFirebase = typeof window !== 'undefined' && (
      window.location.hostname.includes('web.app') || 
      window.location.hostname.includes('firebaseapp.com')
  );
  const baseUrl = isFirebase ? 'https://8e2fc305eb48e78e-172-250-5-58.serveousercontent.com' : '';
  
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

export type Item = z.infer<typeof api.items.list.responses[200]>[number];
