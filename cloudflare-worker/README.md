# Cloudflare Worker Setup for PromptCast Telemetry

## Zero-Cost Privacy-Preserving Telemetry

This worker collects **only** anonymous failure counts. No user data, IPs, or personal information is ever stored.

## Setup Instructions

### 1. Create Cloudflare Account
- Sign up at [workers.cloudflare.com](https://workers.cloudflare.com)
- Free tier: 100,000 requests/day (more than enough)

### 2. Create KV Namespace
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Create KV namespace
wrangler kv:namespace create "COUNTER"
```

This will output something like:
```
{ binding = "COUNTER", id = "abc123..." }
```

### 3. Configure wrangler.toml
Create `wrangler.toml` in this directory:

```toml
name = "promptcast-telemetry"
main = "worker.js"
compatibility_date = "2025-12-08"

kv_namespaces = [
  { binding = "COUNTER", id = "YOUR_KV_ID_HERE" }
]

[vars]
ENVIRONMENT = "production"
```

### 4. Deploy
```bash
wrangler deploy
```

Your worker will be available at:
```
https://promptcast-telemetry.YOUR_SUBDOMAIN.workers.dev
```

### 5. (Optional) Add Custom Domain
In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click "Triggers" → "Custom Domains"
4. Add: `telemetry.yourdomain.com`

### 6. Update Extension
In `extension/background.js`, update:
```javascript
const CONFIG = {
  TELEMETRY_URL: 'https://telemetry.yourdomain.com/hit',
  // ...
};
```

## API Endpoints

### POST /hit
Record a failure event (called by extension)
```
POST /hit?platform=kimi&v=1.0.0
```

### GET /health
View aggregated statistics (public)
```
GET /health
```

Response:
```json
{
  "timestamp": "2025-12-08T00:00:00Z",
  "total_failures_24h": 42,
  "by_platform": {
    "kimi": 15,
    "chatgpt": 12,
    "gemini": 10,
    "claude": 5
  }
}
```

### GET /status
Simple uptime check
```
GET /status
```

## Privacy Guarantees

✅ **What is stored:**
- Platform name (e.g., "kimi")
- Extension version (e.g., "1.0.0")
- Count of failures (number only)

❌ **What is NOT stored:**
- User IP addresses
- Prompt content
- User identifiers
- Timestamps per user
- Any personal data

## Cost Analysis

| Users | Avg Failures/User/Day | Total Requests/Day | Cost |
|-------|----------------------|-------------------|------|
| 10K   | 0.1                  | 1,000             | $0   |
| 100K  | 0.1                  | 10,000            | $0   |
| 1M    | 0.1                  | 100,000           | $0   |

**Free tier limit:** 100,000 requests/day

Even with 1M users, you're within the free tier because:
- Only failures are reported (not successes)
- No-cors mode means no tracking overhead
- 24h data expiration keeps storage minimal

## Monitoring

View real-time metrics:
```bash
wrangler tail
```

View KV contents:
```bash
wrangler kv:key list --namespace-id YOUR_KV_ID
```

## Troubleshooting

**Worker not responding:**
```bash
# Check logs
wrangler tail

# Check deployment status
wrangler deployments list
```

**KV namespace not working:**
```bash
# Verify binding
wrangler kv:namespace list

# Test write
wrangler kv:key put --namespace-id YOUR_KV_ID "test" "123"

# Test read
wrangler kv:key get --namespace-id YOUR_KV_ID "test"
```

## Security Notes

- Worker uses `no-cors` mode to prevent credential leakage
- No authentication required (public write, counts only)
- Rate limiting handled by Cloudflare automatically
- DDoS protection included in free tier
