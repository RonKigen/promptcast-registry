# Privacy Policy for PromptCast

**Last Updated**: December 8, 2025

## TL;DR

✅ **Your prompts and AI responses NEVER leave your browser**  
✅ **We have zero access to your data**  
✅ **No tracking, no analytics, no surveillance**  
✅ **100% open source - audit the code yourself**

---

## Our Philosophy

PromptCast is built on a **client-first, zero-backend** architecture. This isn't marketing speak—it's technically impossible for us to access your data because:

1. We don't run servers that handle user data
2. We don't have authentication (no user accounts)
3. We don't use tracking libraries
4. The extension operates entirely in your browser

## What Data is Stored (And Where)

### 1. Local Storage (`chrome.storage.local`)
**Stored on your device only. Never synced or transmitted.**

| Data Type | Purpose | Retention | Can Be Deleted? |
|-----------|---------|-----------|-----------------|
| Prompt history | Show recent prompts in UI | Last 20 prompts | ✅ Yes (Privacy Audit → Flush All) |
| AI responses | Display in Response Inbox | Until manually deleted | ✅ Yes (Privacy Audit → Flush All) |
| Selector cache | Faster platform detection | 6 hours | ✅ Yes (auto-expires) |
| Draft prompts | Restore on popup reopen | Until sent | ✅ Yes (automatically) |

**Storage Limit**: 5MB (browser enforced)  
**Encryption**: Browser's built-in storage encryption

### 2. Sync Storage (`chrome.storage.sync`)
**Synced across your Chrome profile via Google's infrastructure. We cannot access this.**

| Data Type | Purpose | Retention | Can Be Deleted? |
|-----------|---------|-----------|-----------------|
| Selected platforms | Remember your preferences | Indefinite | ✅ Yes (Privacy Audit → Flush All) |
| UI settings | Theme, layout preferences | Indefinite | ✅ Yes |

**Storage Limit**: 100KB (Chrome enforced)  
**Sync Provider**: Google Chrome (see [Google's Privacy Policy](https://policies.google.com/privacy))

### 3. Session Storage (`chrome.storage.session`)
**RAM only. Deleted when browser closes.**

| Data Type | Purpose | Retention | Can Be Deleted? |
|-----------|---------|-----------|-----------------|
| Active tab state | Track which tabs are open | Until tab closes | ✅ Yes (close tab) |
| Injection status | Current operation state | Until operation completes | ✅ Yes (automatic) |

---

## What We Fetch from the Internet

### 1. GitHub Pages (Public Configuration Files)

**What**: Selector definitions, feature flags, prompt templates  
**URL**: `https://ronkigen.github.io/promptcast-registry/`  
**Frequency**: Every 6 hours (or on extension restart)  
**Data Sent**: None (standard HTTP GET request)

**What is NOT sent:**
- ❌ Your prompts
- ❌ Cookies
- ❌ User identifiers
- ❌ IP address (GitHub logs this, not us - see [GitHub Privacy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement))

**Example Request:**
```http
GET /promptcast-registry/selectors-v1.json HTTP/1.1
Host: ronkigen.github.io
If-None-Match: "abc123"  # etag for caching
```

### 2. Cloudflare Workers (Anonymous Failure Telemetry)

**What**: Counts of selector failures per platform  
**URL**: `https://telemetry.promptcast.com/hit`  
**Frequency**: Only when a selector fails  
**Data Sent**: `platform=kimi&v=1.0.0`

**What is sent:**
- ✅ Platform name (e.g., "kimi", "chatgpt")
- ✅ Extension version (e.g., "1.0.0")

**What is NOT sent:**
- ❌ Your prompt content
- ❌ User identifier
- ❌ IP address (no logging enabled on Cloudflare)
- ❌ Cookies
- ❌ Timestamps per user

**Why we collect this:**
To detect when AI platforms update their UI and break the extension for everyone. This helps us prioritize selector updates.

**Can you opt out?**
Yes. Set `privacy.telemetry = false` in extension options (future feature).

**Example Request:**
```http
POST /hit?platform=kimi&v=1.0.0 HTTP/1.1
Host: telemetry.promptcast.com
Origin: chrome-extension://[extension-id]
```

---

## What We CANNOT Access

Due to Chrome's security model and our zero-backend architecture, we **physically cannot access**:

1. **Your AI Account Credentials**
   - We never request login permissions
   - Credentials are stored by your browser, not the extension

2. **Your Browsing History**
   - We only access the active tab when you explicitly trigger the extension
   - Permission: `activeTab` (not `<all_urls>`)

3. **Your AI Conversations**
   - We only read AI responses after you send a prompt via PromptCast
   - We cannot read existing chat history

4. **Your Email or Identity**
   - No authentication system
   - No user accounts

5. **Cross-Site Cookies**
   - We don't access or modify cookies

---

## How AI Platform Interactions Work

When you click "Launch + Inject Prompt":

1. **Tab Creation**: Extension opens tabs for selected AI platforms
2. **Content Script Injection**: Script runs in each tab (isolated from page's scripts)
3. **DOM Manipulation**: Script finds input box, types prompt, clicks send
4. **Response Harvesting**: Script watches for AI response, extracts text
5. **Local Storage**: Response stored in `chrome.storage.local`

**What the AI platform sees:**
- Your existing login session (cookies)
- The prompt (as if you typed it manually)
- Your browser fingerprint (User-Agent, etc.)

**What the AI platform does NOT see:**
- That you're using PromptCast (just looks like normal usage)
- Prompts sent to other platforms

---

## Third-Party Services

### GitHub Pages (Microsoft)
- **Purpose**: Host public configuration files
- **Data Collected by GitHub**: HTTP request logs (IP, User-Agent, timestamp)
- **Our Access**: None (we cannot view GitHub's logs)
- **Their Privacy Policy**: https://docs.github.com/en/site-policy/privacy-policies

### Cloudflare Workers (Cloudflare Inc.)
- **Purpose**: Aggregate anonymous failure counts
- **Data Collected by Cloudflare**: None (we disabled IP logging)
- **Our Access**: Only aggregated counts (e.g., "kimi: 15 failures today")
- **Their Privacy Policy**: https://www.cloudflare.com/privacypolicy/

### AI Platforms (You Interact With Directly)
- ChatGPT (OpenAI)
- Gemini (Google)
- Kimi (Moonshot AI)
- Claude (Anthropic)
- Perplexity (Perplexity AI)

**Important**: Your interactions with these platforms are governed by their privacy policies, not ours. PromptCast simply automates what you would do manually.

---

## Your Rights (GDPR, CCPA, etc.)

### Right to Access
**What data do you have about me?**  
None. All data is stored locally on your device.

### Right to Deletion
**How do I delete my data?**  
Click the extension icon → Privacy Audit → "Flush All Data"

### Right to Portability
**Can I export my data?**  
Yes. All data is stored in `chrome.storage.local` which you can export via Chrome DevTools:
```javascript
chrome.storage.local.get(null, (data) => console.log(JSON.stringify(data)));
```

### Right to Opt-Out
**How do I stop data collection?**  
Uninstall the extension. There's no persistent tracking.

---

## Security Measures

### Content Security Policy
Our extension enforces strict CSP:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://ronkigen.github.io"
}
```

This prevents:
- Loading external scripts
- Connecting to unauthorized domains
- Code injection attacks

### Permissions Justification

| Permission | Why We Need It | What We DON'T Do |
|------------|----------------|------------------|
| `activeTab` | Inject prompt into current AI tab | Access other tabs |
| `scripting` | Execute content script on-demand | Run scripts without user action |
| `storage` | Save prompts locally | Send data to servers |
| `alarms` | Schedule selector updates | Track user activity |
| `contextMenus` | Add right-click menu | Monitor your selections |
| `tabs` | Create/manage AI platform tabs | Read tab contents without permission |

### No Obfuscation
All code is readable JavaScript. No minification, no obfuscation.  
**Audit it yourself**: https://github.com/RonKigen/promptcast-registry

---

## Changes to This Policy

When we update this policy:
1. "Last Updated" date will change
2. Users will be notified via in-extension banner
3. Old versions archived at: https://github.com/RonKigen/promptcast-registry/commits/main/PRIVACY.md

---

## Contact

**Questions about privacy?**
- Open an issue: https://github.com/RonKigen/promptcast-registry/issues
- Email: privacy@yourdomain.com (if applicable)

**Data Subject Requests (GDPR/CCPA):**
Since we don't collect personal data, there's nothing to request. But if you have concerns, open an issue and we'll clarify.

---

## Transparency Report

We publish quarterly transparency reports showing:
- Number of active users (from Chrome Web Store public stats only)
- Aggregated failure counts (from Cloudflare Worker `/health` endpoint)
- Zero government data requests (because we have no data to give)

Latest report: [TRANSPARENCY.md](TRANSPARENCY.md)

---

## Technical Details for Auditors

### Data Flow Diagram
```
┌─────────────┐
│ Your Browser│
│             │
│ ┌─────────┐ │
│ │Extension│ │──┐
│ └─────────┘ │  │ Prompts (local only)
│      │      │  │
│      ▼      │  ▼
│ ┌─────────┐ │ ┌───────────────┐
│ │Local    │ │ │chrome.storage │
│ │Storage  │ │ │    .local     │
│ └─────────┘ │ └───────────────┘
│             │
│ HTTP Requests│
│      │      │
└──────┼──────┘
       │
       ├──GET──► GitHub Pages (public files)
       │
       └──POST─► Cloudflare Worker (counts only)
```

### Storage Schema
```typescript
// chrome.storage.local
{
  promptHistory: Array<{
    text: string;
    timestamp: number;
    platforms: string[];
  }>;
  responses: Map<string, {
    platform: string;
    prompt: string;
    response: string;
    timestamp: number;
  }>;
  selectors: {
    version: string;
    platforms: {...};
  };
  selectors_etag: string;
  selectors_timestamp: number;
}

// chrome.storage.sync
{
  selectedPlatforms: string[];
  defaultPlatforms: string[];
}
```

---

**This privacy policy is a living document.** As PromptCast evolves, we'll update this policy and maintain our zero-data-collection commitment.

**No tracking. No surveillance. No compromise.**
