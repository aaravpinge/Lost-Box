import type { VercelRequest, VercelResponse } from '@vercel/node';
import app, { initPromise } from './server/index';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure the server has finished registering routes and connecting to DB
  await initPromise;
  
  // Pass the request off to the Express app
  return app(req as any, res as any);
}
