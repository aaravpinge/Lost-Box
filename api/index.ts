import { VercelRequest, VercelResponse } from '@vercel/node';


export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Loading server from source...");
    // Import the server directly
    const { app, initPromise } = await import('./server/index.js');
    
    if (initPromise) {
      console.log("Waiting for server initialization...");
      await initPromise;
    }
    
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