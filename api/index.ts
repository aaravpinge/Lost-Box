import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // We use require because esbuild bundles the server as a CJS file
  // and Vercel's runtime better supports loading CJS this way
  const bundledApp = require('./index.cjs');
  
  // Handle both module.exports = app and module.exports.default = app
  const app = bundledApp.default || bundledApp;
  
  return app(req, res);
}
