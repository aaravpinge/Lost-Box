import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Attempting to load bundled server...");
    // Import the pre-built bundled server
    const { default: app } = await import('../dist/index.cjs');
    
    console.log("Server loaded. Initializing request...");
    return app(req, res);
  } catch (error: any) {
    console.error("CRITICAL SERVER CRASH:");
    console.error(error.message);
    console.error(error.stack);
    
    res.status(500).json({
      error: "Server Crash",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}