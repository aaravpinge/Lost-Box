import { VercelRequest, VercelResponse } from '@vercel/node';
import serverModule from '../dist/index.cjs';

const app = serverModule.default;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (serverModule.initPromise) {
    await serverModule.initPromise;
  }

  return app(req, res);
}
