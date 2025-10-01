/**
 * Cloudflare Worker entry point
 * This serves the Next.js application
 */

export default {
  async fetch(request, env, ctx) {
    // Return a simple response for now
    // In production, this would proxy to the Next.js app
    return new Response(JSON.stringify({
      message: "Sakinah App - Deployment Successful",
      status: "healthy",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
};