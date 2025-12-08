// PromptCast Service Worker - Stateless orchestrator for 1M+ users
// Zero-cost architecture with GitHub Pages + Cloudflare Workers

const CONFIG = {
  REGISTRY_URL: 'https://ronkigen.github.io/promptcast-registry/public/selectors-v1.json',
  FLAGS_URL: 'https://ronkigen.github.io/promptcast-registry/public/flags.json',
  TELEMETRY_URL: 'https://promptcast-telemetry.pixora-ai.workers.dev/hit',
  SELECTORS_TTL: 6 * 60 * 60 * 1000, // 6 hours
  TAB_IDLE_TIMEOUT: Infinity, // Never auto-close tabs - keep them for reuse
  MAX_WARM_TABS: 100 // Track unlimited tabs
};

// Platform definitions
const PLATFORMS = {
  kimi: { name: 'Kimi', url: 'https://www.kimi.com/', color: '#00C9A7' },
  chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com/', color: '#10A37F' },
  gemini: { name: 'Gemini', url: 'https://gemini.google.com/app', color: '#4285F4' },
  claude: { name: 'Claude', url: 'https://claude.ai/', color: '#D97757' },
  perplexity: { name: 'Perplexity', url: 'https://www.perplexity.ai/', color: '#20808D' },
  deepseek: { name: 'DeepSeek', url: 'https://chat.deepseek.com/', color: '#1E90FF' },
  groq: { name: 'Groq', url: 'https://groq.com/', color: '#F55036' },
  mistral: { name: 'Mistral', url: 'https://chat.mistral.ai/', color: '#FF7000' },
  pi: { name: 'Pi', url: 'https://pi.ai/', color: '#8B5CF6' },
  huggingface: { name: 'HuggingChat', url: 'https://huggingface.co/chat/', color: '#FFD21E' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/chat/', color: '#5B21B6' },
  poe: { name: 'Poe', url: 'https://poe.com/', color: '#FF4757' },
  cline: { name: 'Cline', url: 'https://cline.bot/', color: '#06B6D4' },
  cursor: { name: 'Cursor', url: 'https://www.cursor.com/', color: '#000000' },
  blackbox: { name: 'Blackbox', url: 'https://www.blackbox.ai/', color: '#1A1A1A' },
  phind: { name: 'Phind', url: 'https://www.phind.com/', color: '#4F46E5' },
  replit: { name: 'Replit', url: 'https://replit.com/', color: '#F26207' },
  ideogram: { name: 'Ideogram', url: 'https://ideogram.ai/', color: '#9333EA' },
  midjourney: { name: 'Midjourney', url: 'https://www.midjourney.com/', color: '#34D399' },
  leonardo: { name: 'Leonardo', url: 'https://leonardo.ai/', color: '#EC4899' },
  you: { name: 'You.com', url: 'https://you.com/', color: '#0EA5E9' },
  andi: { name: 'Andi', url: 'https://andisearch.com/', color: '#8B5CF6' }
};

// Tab pool management
const tabPool = new Map(); // { platformId: { tabId, lastUsed, state } }
const activeInjections = new Map(); // { injectionId: { platforms, prompt, status } }

// ============================================================
// CORE: Selector Registry with GitHub Pages Auto-Update
// ============================================================

async function fetchSelectors() {
  try {
    const { selectors, selectors_etag, selectors_timestamp } = await chrome.storage.local.get([
      'selectors',
      'selectors_etag',
      'selectors_timestamp'
    ]);

    // Check if cache is still valid
    if (selectors && selectors_timestamp && Date.now() - selectors_timestamp < CONFIG.SELECTORS_TTL) {
      return selectors;
    }

    // Fetch with etag caching
    const headers = {};
    if (selectors_etag) {
      headers['If-None-Match'] = selectors_etag;
    }

    const response = await fetch(CONFIG.REGISTRY_URL, { headers, cache: 'no-store' });

    if (response.status === 304) {
      // Not modified, update timestamp
      await chrome.storage.local.set({ selectors_timestamp: Date.now() });
      return selectors;
    }

    if (response.ok) {
      const data = await response.json();
      const etag = response.headers.get('ETag');
      
      await chrome.storage.local.set({
        selectors: data,
        selectors_etag: etag,
        selectors_timestamp: Date.now()
      });

      console.log('[PromptCast] Selectors updated:', data.version);
      return data;
    }

    // Fallback to cached
    return selectors || getDefaultSelectors();
  } catch (error) {
    console.error('[PromptCast] Failed to fetch selectors:', error);
    const { selectors } = await chrome.storage.local.get('selectors');
    return selectors || getDefaultSelectors();
  }
}

async function fetchFlags() {
  try {
    const response = await fetch(CONFIG.FLAGS_URL, { cache: 'no-store' });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('[PromptCast] Failed to fetch flags:', error);
  }
  return { rollout: {}, force_refresh: false };
}

function getDefaultSelectors() {
  // Hardcoded fallback if GitHub is unreachable
  return {
    version: '1.0.0-fallback',
    platforms: {
      kimi: {
        url: 'https://kimi.ai/chat',
        selectors: {
          input: ['#prompt-textarea', 'div[data-testid="input"]', 'textarea[placeholder*="Ask"]'],
          send: ['button[aria-label="Send message"]', 'button:has(svg)', 'button.primary']
        },
        signin_detect: ['button:contains("Sign In")', 'a[href*="login"]'],
        limit_detect: ['div:contains("limit")', 'div:contains("cap")']
      },
      chatgpt: {
        url: 'https://chat.openai.com/',
        selectors: {
          input: ['#prompt-textarea', 'textarea[placeholder*="Message"]'],
          send: ['button[data-testid="send-button"]']
        },
        signin_detect: ['button:contains("Log in")'],
        limit_detect: ['div:contains("rate limit")']
      },
      gemini: {
        url: 'https://gemini.google.com/app',
        selectors: {
          input: ['rich-textarea', 'div[contenteditable="true"]'],
          send: ['button[aria-label*="Send"]']
        },
        limit_detect: ['div:contains("too many requests")']
      },
      claude: {
        url: 'https://claude.ai/',
        selectors: {
          input: ['div[contenteditable="true"]', 'textarea'],
          send: ['button[aria-label="Send Message"]']
        },
        signin_detect: ['a[href*="login"]']
      }
    }
  };
}

// ============================================================
// TAB LIFECYCLE: Smart Pooling & Garbage Collection
// ============================================================

async function getOrCreateTab(platformId) {
  // Check warm pool first
  if (tabPool.has(platformId)) {
    const pooled = tabPool.get(platformId);
    try {
      const tab = await chrome.tabs.get(pooled.tabId);
      
      // Verify tab still exists and is on the right domain
      const platformDomain = PLATFORMS[platformId].url.split('/')[2];
      if (tab && tab.url && tab.url.includes(platformDomain)) {
        // Tab is valid - reuse it
        console.log(`[PromptCast] Reusing existing tab for ${platformId}: ${tab.id}`);
        
        // Update last used timestamp
        tabPool.set(platformId, { ...pooled, lastUsed: Date.now() });
        
        // Bring tab to front (optional - make it active)
        await chrome.tabs.update(tab.id, { active: true });
        
        return tab.id;
      } else {
        // Tab navigated away - remove from pool
        console.log(`[PromptCast] Tab navigated away from ${platformId}, creating new tab`);
        tabPool.delete(platformId);
      }
    } catch (error) {
      // Tab no longer exists - remove from pool
      console.log(`[PromptCast] Tab closed for ${platformId}, creating new tab`);
      tabPool.delete(platformId);
    }
  }

  // Create new tab
  console.log(`[PromptCast] Creating new tab for ${platformId}`);
  const tab = await chrome.tabs.create({
    url: PLATFORMS[platformId].url,
    active: false
  });

  tabPool.set(platformId, {
    tabId: tab.id,
    lastUsed: Date.now(),
    state: 'loading'
  });

  return tab.id;
}

async function garbageCollectTabs() {
  // Only remove closed tabs from tracking - don't auto-close them
  const tabsToRemove = [];

  for (const [platformId, pooled] of tabPool.entries()) {
    try {
      await chrome.tabs.get(pooled.tabId);
      // Tab exists - keep it in pool
    } catch (error) {
      // Tab was manually closed by user - remove from tracking
      console.log(`[PromptCast] Removing closed tab from pool: ${platformId}`);
      tabsToRemove.push(platformId);
    }
  }

  tabsToRemove.forEach(id => tabPool.delete(id));
  
  if (tabsToRemove.length > 0) {
    console.log(`[PromptCast] Cleaned up ${tabsToRemove.length} closed tabs from tracking`);
  }
}

// ============================================================
// PROMPT INJECTION: Multi-Platform Orchestration
// ============================================================

async function launchAndInject(platforms, prompt, options = {}) {
  const injectionId = `inj_${Date.now()}`;
  const results = {};

  activeInjections.set(injectionId, {
    platforms,
    prompt,
    status: 'launching',
    results
  });

  // Get selectors
  const selectorsData = await fetchSelectors();

  // Launch all platforms in parallel
  const launches = platforms.map(async (platformId) => {
    try {
      const tabId = await getOrCreateTab(platformId);
      
      // Wait for tab to load
      await waitForTabReady(tabId);

      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['contentScript.js']
      });

      // Send injection command
      const platformConfig = selectorsData.platforms[platformId];
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'injectPrompt',
        prompt,
        platform: platformId,
        selectors: {
          input: platformConfig.selectors.input,
          send: platformConfig.selectors.send,
          signin_detect: platformConfig.signin_detect,
          limit_detect: platformConfig.limit_detect
        },
        options
      });

      results[platformId] = response;

      // Store result in history
      await storeInjectionResult(injectionId, platformId, response);

      return { platformId, success: true, response };
    } catch (error) {
      console.error(`[PromptCast] Failed to inject into ${platformId}:`, error);
      results[platformId] = { success: false, error: error.message };
      
      // Report failure telemetry
      await reportFailure(platformId);
      
      return { platformId, success: false, error: error.message };
    }
  });

  const launchResults = await Promise.allSettled(launches);

  // Update injection status
  activeInjections.set(injectionId, {
    ...activeInjections.get(injectionId),
    status: 'completed',
    results
  });

  return {
    injectionId,
    results: launchResults.map(r => r.value || r.reason)
  };
}

async function waitForTabReady(tabId, maxWait = 15000) {
  const startTime = Date.now();
  
  // First: Wait for page load
  while (Date.now() - startTime < maxWait) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete') {
        break;
      }
    } catch (error) {
      throw new Error('Tab was closed');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Second: Wait for SPA hydration (React/Vue rendering)
  // Give SPAs 3-5 seconds to render input elements
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  console.log(`[PromptCast] Tab ${tabId} ready after ${Date.now() - startTime}ms`);
  return true;
}

async function storeInjectionResult(injectionId, platformId, result) {
  const { injectionHistory = [] } = await chrome.storage.local.get('injectionHistory');
  
  const entry = {
    injectionId,
    platform: platformId,
    timestamp: Date.now(),
    success: result.success,
    error: result.error || null
  };

  injectionHistory.unshift(entry);
  
  // Keep only last 50 results
  if (injectionHistory.length > 50) {
    injectionHistory.length = 50;
  }

  await chrome.storage.local.set({ injectionHistory });
}

// ============================================================
// PRIVACY-PRESERVING TELEMETRY
// ============================================================

async function reportFailure(platform) {
  const manifest = chrome.runtime.getManifest();
  
  try {
    await fetch(`${CONFIG.TELEMETRY_URL}?platform=${platform}&v=${manifest.version}`, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store'
    });
  } catch (error) {
    // Fail silently - telemetry is optional
  }
}

// ============================================================
// MESSAGE HANDLERS
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'launchAndInject') {
    launchAndInject(message.platforms, message.prompt, message.options)
      .then(sendResponse)
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'getSelectors') {
    fetchSelectors()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message.action === 'getInjectionStatus') {
    const status = activeInjections.get(message.injectionId);
    sendResponse(status || null);
    return false;
  }

  if (message.action === 'reportFailure') {
    reportFailure(message.platform);
    return false;
  }
});

// ============================================================
// CONTEXT MENU: Right-Click to Send
// ============================================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'promptcast-send-selection',
    title: 'Send to AI Platforms',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'promptcast-send-page',
    title: 'Send Page Summary to AI',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'promptcast-send-selection') {
    const { defaultPlatforms = ['chatgpt', 'gemini'] } = await chrome.storage.sync.get('defaultPlatforms');
    
    await launchAndInject(defaultPlatforms, info.selectionText, {
      source: 'context-menu'
    });
    
    // Show notification
    chrome.action.setBadgeText({ text: '✓' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
  }

  if (info.menuItemId === 'promptcast-send-page') {
    const { defaultPlatforms = ['chatgpt'] } = await chrome.storage.sync.get('defaultPlatforms');
    const prompt = `Summarize this page: ${tab.title}\n${tab.url}`;
    
    await launchAndInject(defaultPlatforms, prompt, {
      source: 'page-summary'
    });
  }
});

// ============================================================
// TAB LIFECYCLE LISTENERS: Track when users close tabs
// ============================================================

chrome.tabs.onRemoved.addListener((tabId) => {
  // Remove closed tabs from pool immediately
  for (const [platformId, pooled] of tabPool.entries()) {
    if (pooled.tabId === tabId) {
      console.log(`[PromptCast] Tab closed by user: ${platformId} (${tabId})`);
      tabPool.delete(platformId);
      break;
    }
  }
});

// ============================================================
// OMNIBOX: Address Bar Integration
// ============================================================

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const { defaultPlatforms = ['chatgpt'] } = await chrome.storage.sync.get('defaultPlatforms');
  await launchAndInject(defaultPlatforms, text, {
    source: 'omnibox'
  });
});

// ============================================================
// PERIODIC TASKS: Updates & Cleanup
// ============================================================

chrome.alarms.create('updateSelectors', { periodInMinutes: 360 }); // 6 hours
chrome.alarms.create('garbageCollect', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateSelectors') {
    fetchSelectors();
  }
  if (alarm.name === 'garbageCollect') {
    garbageCollectTabs();
  }
});

// Initial selector fetch on installation
chrome.runtime.onInstalled.addListener(() => {
  fetchSelectors();
});

console.log('[PromptCast] Service Worker initialized');
