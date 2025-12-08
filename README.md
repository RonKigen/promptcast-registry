<<<<<<< HEAD
# PromptCast 🚀

**Universal AI Orchestration Layer** - Send prompts to multiple AI platforms simultaneously, harvest responses, and manage everything from a unified dashboard.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Manifest](https://img.shields.io/badge/manifest-v3-orange)

## 🎯 What Makes PromptCast Different?

Unlike other AI tools, PromptCast is **NOT**:
- ❌ A chatbot with its own AI backend
- ❌ An API wrapper that costs you money
- ❌ A tool that stores your conversations

PromptCast **IS**:
- ✅ A browser automation tool that runs entirely client-side
- ✅ Zero-cost for you (uses your existing AI accounts)
- ✅ Privacy-first (prompts never leave your browser)
- ✅ Self-healing (auto-updates when AI sites change)

## ✨ Features

### Core Functionality
- **Multi-Platform Launch**: Send one prompt to ChatGPT, Gemini, Kimi, Claude, and Perplexity simultaneously
- **Response Harvesting**: Automatically extracts AI responses back into the extension
- **Unified Inbox**: Compare responses side-by-side in one dashboard
- **Smart Tab Management**: Pre-loads and reuses tabs for instant launches

### Advanced Features
- **Context Menu Integration**: Right-click any selected text → "Send to AI Platforms"
- **Omnibox Support**: Type `ai your prompt` in the address bar
- **Prompt History**: Save and reuse your last 20 prompts
- **Privacy Dashboard**: Full transparency on what data is stored locally
- **Self-Healing Selectors**: Auto-updates when AI platforms change their UI

### Zero-Cost Architecture
- **GitHub Pages**: Stores selectors, flags, and templates (free, unlimited)
- **Cloudflare Workers**: Privacy-preserving failure telemetry (100k req/day free)
- **No Backend Costs**: Everything runs in your browser

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  User Browser (1M+ users supported)        │
│  ┌──────────────────────────────────────┐  │
│  │  Service Worker                      │  │
│  │  - Tab lifecycle management          │  │
│  │  - Selector auto-update (6h)         │  │
│  │  - Context menu + Omnibox            │  │
│  └──────────────────────────────────────┘  │
│              ▲                              │
│              │                              │
│  ┌──────────────────────────────────────┐  │
│  │  Content Script (injected on-demand) │  │
│  │  - 5+ fallback selectors per element│  │
│  │  - State detection (login/limits)    │  │
│  │  - Response harvesting               │  │
│  └──────────────────────────────────────┘  │
│              ▲                              │
│              │                              │
│  ┌──────────────────────────────────────┐  │
│  │  Popup UI                            │  │
│  │  - Prompt input + platform selector  │  │
│  │  - Response inbox (unified)          │  │
│  │  - Privacy audit                     │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              │
              │ Fetch (etag cached)
              │
┌─────────────────────────────────────────────┐
│  GitHub Pages (Free, Public Repo)         │
│  - selectors-v1.json (UI selectors)        │
│  - flags.json (feature rollout)            │
│  - templates.json (community prompts)      │
└─────────────────────────────────────────────┘
              │
              │ Anonymous failure counts
              │
┌─────────────────────────────────────────────┐
│  Cloudflare Workers (100k/day free)        │
│  - POST /hit (record failures)             │
│  - GET /health (public stats)              │
└─────────────────────────────────────────────┘
```

**Total Monthly Cost: $0.00**

## 🚀 Quick Start

### For Users

1. **Clone or Download**
   ```bash
   git clone https://github.com/YOUR_USERNAME/promptcast.git
   cd promptcast
   ```

2. **Load Extension**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

3. **Try It Out**
   - Click the PromptCast icon in your toolbar
   - Select platforms (ChatGPT + Gemini)
   - Enter a prompt: "Explain quantum computing simply"
   - Click "Launch + Inject Prompt"

4. **Keyboard Shortcuts**
   - `Ctrl+Shift+A`: Open PromptCast
   - `Ctrl+Shift+Q`: Send selected text to AIs
   - `Ctrl+Enter` (in popup): Quick launch

### For Developers

See [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Local development setup
- GitHub Pages deployment
- Cloudflare Worker configuration
- Selector maintenance guide

## 📊 Supported Platforms

| Platform | Status | Login Required | Rate Limits |
|----------|--------|----------------|-------------|
| ChatGPT | ✅ Working | Yes | ~50 msgs/3h (free) |
| Gemini | ✅ Working | Yes | Generous |
| Kimi | ✅ Working | Yes | ~50 msgs/day |
| Claude | ✅ Working | Yes | ~50 msgs/day (free) |
| Perplexity | ⚠️ Beta | Optional | 5 searches/4h (free) |

## 🔒 Privacy Guarantees

### What Stays on Your Device (Never Sent Anywhere)
- ✅ Your prompts → `chrome.storage.local`
- ✅ AI responses → `chrome.storage.local`
- ✅ Settings → `chrome.storage.sync` (Google's infra)
- ✅ Tab state → `chrome.storage.session` (RAM only)

### What We Fetch (Public Data Only)
- **GitHub Pages**: Configuration files (selectors, flags)
  - No cookies or user identifiers sent
  - Standard HTTP requests with etag caching
- **Cloudflare Workers**: Anonymous failure counts
  - Only sends: `platform=gemini`, `v=1.0.0`
  - No IP logging enabled

### What We Cannot Access
- ❌ Your AI account credentials
- ❌ Your browsing history (except active tab when triggered)
- ❌ Your email or identity
- ❌ Cookies from AI platforms

**Full Privacy Policy**: [PRIVACY.md](PRIVACY.md)

## 🛠️ How It Works

### 1. Selector Registry (GitHub Pages)
The extension fetches UI selectors from a public JSON file every 6 hours:

```json
{
  "kimi": {
    "input": ["#prompt-textarea", "textarea.fallback"],
    "send": ["button[aria-label='Send']"]
  }
}
```

When Kimi updates their UI, you update this file → all users auto-fix within 6 hours (no Chrome Store delay).

### 2. Self-Healing Selector Chain
Content script tries each selector sequentially with 100ms delays:

```javascript
const selectors = ["#new-id", "#old-id", ".fallback-class"];
for (const selector of selectors) {
  const element = document.querySelector(selector);
  if (element && isVisible(element)) return element;
  await sleep(100);
}
```

### 3. Tab Pooling
- Pre-loads 1-2 tabs for top platforms
- Reuses tabs when possible (faster launches)
- Garbage collects idle tabs after 5 minutes

### 4. Response Harvesting
- MutationObserver watches for AI response bubbles
- Extracts text in chunks (avoids browser freeze)
- Stores locally with platform + timestamp metadata

## 📈 Scalability

| Users | Selector Updates | Extension Updates | Cost |
|-------|------------------|-------------------|------|
| 10K   | Instant (GitHub Pages) | 3-5 days (Chrome Store) | $0 |
| 100K  | Instant | 3-5 days | $0 |
| 1M    | Instant | 3-5 days | $0 |

**Why it scales:**
- GitHub Pages handles unlimited traffic (CDN)
- Cloudflare Workers: 100k failures/day (more than enough since only failures are reported)
- No database, no auth, no session management

## 🤝 Contributing

### Reporting Broken Selectors
When a platform updates and breaks:
1. Open DevTools on the AI platform
2. Inspect the input box → copy the selector
3. Open an issue with: Platform name, new selector, screenshot
4. Or submit a PR to `public/selectors-v1.json`

### Adding New Platforms
1. Fork the repo
2. Add platform to `public/selectors-v1.json`
3. Test with the extension
4. Submit PR with screenshots

### Community Templates
Share your best prompts:
1. Add to `public/templates.json`
2. Include description + recommended platforms
3. Submit PR

## 🐛 Troubleshooting

### "Input element not found"
- Platform updated their UI
- Check GitHub repo for selector updates
- Manually refresh: Click privacy audit → "Force Update"

### "Sign-in required"
- You're not logged into that AI platform
- Open the platform manually and sign in
- Try again

### "Rate limit reached"
- AI platform free tier limit hit
- Wait for reset (usually 3-4 hours)
- Extension will detect and show warning

### Extension not appearing
- Check `chrome://extensions/` → PromptCast is enabled
- Check for errors in the extension
- Try reloading the extension

## 📝 Roadmap

### v1.1 (Planned)
- [ ] Template system (import/export prompts)
- [ ] Response diff view (highlight differences)
- [ ] Workflow builder (chain prompts)
- [ ] Import/export settings

### v1.2 (Future)
- [ ] Multi-step chaining (output of AI A → input of AI B)
- [ ] Notion/Obsidian export
- [ ] Voice input support
- [ ] Browser action badge notifications

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Inspired by the need to compare AI outputs without copy-pasting
- Architecture influenced by uBlock Origin's zero-cost update model
- Privacy principles from EFF's Do Not Track

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/promptcast/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/promptcast/discussions)
- **Updates**: Watch the repo for selector updates

---

**Built with ❤️ for the AI power-user community**

*No servers, no costs, no compromises on privacy.*
=======
# promptcast-registry
>>>>>>> 0120768f38948f8c686fed8582fb5751a0c5775d
