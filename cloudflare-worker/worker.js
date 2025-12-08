// PromptCast Telemetry Worker - Privacy-Preserving Failure Tracking
// Deploy to Cloudflare Workers (100k requests/day FREE)

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // CORS headers for cross-origin requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // POST /hit - Record a failure event
  if (url.pathname === '/hit' && request.method === 'POST') {
    const platform = url.searchParams.get('platform');
    const version = url.searchParams.get('v');
    
    if (!platform || !version) {
      return new Response('Missing parameters', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    try {
      // Use KV namespace to store counts
      const key = `fail_${platform}_${version}`;
      const current = await COUNTER.get(key);
      const newCount = (parseInt(current) || 0) + 1;
      
      // Store with 24h expiration
      await COUNTER.put(key, newCount.toString(), { 
        expirationTtl: 86400 // 24 hours
      });

      return new Response('ok', { 
        status: 200,
        headers: corsHeaders 
      });
    } catch (error) {
      return new Response('error', { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }

  // GET /health - Return aggregated statistics (public, non-sensitive)
  if (url.pathname === '/health' && request.method === 'GET') {
    try {
      const keys = await COUNTER.list();
      const stats = {};
      
      for (const key of keys.keys) {
        const value = await COUNTER.get(key.name);
        stats[key.name] = parseInt(value) || 0;
      }

      // Calculate totals by platform
      const summary = {};
      for (const [key, count] of Object.entries(stats)) {
        const platform = key.split('_')[1]; // Extract platform from "fail_kimi_1.0.0"
        if (!summary[platform]) {
          summary[platform] = 0;
        }
        summary[platform] += count;
      }

      const response = {
        timestamp: new Date().toISOString(),
        uptime: '100%',
        total_failures_24h: Object.values(stats).reduce((a, b) => a + b, 0),
        by_platform: summary,
        note: 'These are anonymous failure counts only. No user data is stored.'
      };

      return new Response(JSON.stringify(response, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // GET /status - Simple uptime check
  if (url.pathname === '/status') {
    return new Response(JSON.stringify({
      status: 'operational',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  // 404 for all other routes
  return new Response('Not Found', { 
    status: 404,
    headers: corsHeaders 
  });
}
