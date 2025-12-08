// PromptCast Content Script - Self-Healing DOM Automation
// Runs inside AI platform pages (ChatGPT, Gemini, Kimi, etc.)

let injectionState = {
  isInjecting: false,
  currentPrompt: null,
  platform: null,
  selectors: null,
  responseObserver: null
};

// ============================================================
// VISUAL DEBUG OVERLAY (Temporary for debugging)
// ============================================================

function showDebugOverlay(message, type = 'info') {
  const overlay = document.getElementById('promptcast-debug') || createDebugOverlay();
  const timestamp = new Date().toLocaleTimeString();
  
  const colors = {
    info: '#0EA5E9',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B'
  };
  
  const logEntry = document.createElement('div');
  logEntry.style.cssText = `
    padding: 8px 12px;
    margin: 4px 0;
    background: ${colors[type]}22;
    border-left: 3px solid ${colors[type]};
    border-radius: 4px;
    font-size: 12px;
    color: #1F2937;
  `;
  logEntry.textContent = `[${timestamp}] ${message}`;
  
  overlay.appendChild(logEntry);
  overlay.scrollTop = overlay.scrollHeight;
  
  console.log(`[PromptCast ${type.toUpperCase()}] ${message}`);
}

function createDebugOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'promptcast-debug';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 300px;
    overflow-y: auto;
    background: white;
    border: 2px solid #10A37F;
    border-radius: 8px;
    padding: 12px;
    z-index: 999999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    font-weight: bold;
    color: #10A37F;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const title = document.createElement('span');
  title.textContent = '🚀 PromptCast Debug';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    background: #EF4444;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 11px;
  `;
  closeBtn.addEventListener('click', () => {
    overlay.remove();
  });
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  overlay.appendChild(header);
  document.body.appendChild(overlay);
  
  return overlay;
}

// ============================================================
// CORE: Self-Healing Selector Discovery
// ============================================================

async function findElement(selectorArray, timeout = 5000) {
  const startTime = Date.now();
  
  showDebugOverlay(`🔍 Searching for element with ${selectorArray.length} selectors...`, 'info');
  
  for (const selector of selectorArray) {
    showDebugOverlay(`Trying: ${selector}`, 'info');
    
    while (Date.now() - startTime < timeout) {
      try {
        let element;
        
        // Support multiple selector types
        if (selector.includes(':contains')) {
          // Custom jQuery-like selector
          element = findByText(selector);
        } else {
          element = document.querySelector(selector);
        }
        
        if (element && isElementVisible(element)) {
          showDebugOverlay(`✅ Found with: ${selector}`, 'success');
          console.log(`[PromptCast] Found element with selector: ${selector}`);
          return element;
        }
      } catch (error) {
        // Invalid selector, continue to next
      }
      
      await sleep(100);
    }
    
    showDebugOverlay(`❌ Failed: ${selector}`, 'warning');
  }
  
  showDebugOverlay(`💀 ALL SELECTORS EXHAUSTED`, 'error');
  throw new Error(`All selectors exhausted: ${selectorArray.join(', ')}`);
}

function findByText(selector) {
  // Match :contains('text') or :contains("text")
  const match = selector.match(/:contains\(['"](.*?)['"]\)/);
  if (!match) {
    showDebugOverlay(`⚠️ Invalid :contains format: ${selector}`, 'warning');
    return null;
  }
  
  const text = match[1];
  const baseSelector = selector.split(':contains')[0] || '*';
  
  showDebugOverlay(`🔍 Looking for "${text}" in ${baseSelector} elements`, 'info');
  
  const elements = document.querySelectorAll(baseSelector);
  showDebugOverlay(`Found ${elements.length} ${baseSelector} elements to check`, 'info');
  
  for (const el of elements) {
    if (el.textContent.toLowerCase().includes(text.toLowerCase())) {
      showDebugOverlay(`✅ Found element with text: ${text}`, 'success');
      return el;
    }
  }
  
  showDebugOverlay(`❌ No ${baseSelector} contains "${text}"`, 'warning');
  return null;
}

function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetParent !== null;
}

// ============================================================
// STATE DETECTION: Login, Rate Limits, Errors
// ============================================================

async function detectPageState(selectors) {
  showDebugOverlay(`📋 Selectors object keys: ${JSON.stringify(Object.keys(selectors))}`, 'info');
  showDebugOverlay(`📋 Input selectors: ${JSON.stringify(selectors.input || selectors.selectors?.input)}`, 'info');
  
  const state = {
    ready: false,
    error: null,
    needsSignIn: false,
    rateLimited: false
  };

  // Check for sign-in requirement
  if (selectors.signin_detect && false) { // DISABLED: Too many false positives
    showDebugOverlay(`🔍 Checking for sign-in...`, 'info');
    try {
      const signInElement = await findElement(selectors.signin_detect, 2000);
      if (signInElement) {
        showDebugOverlay(`⚠️ Sign-in required`, 'warning');
        state.needsSignIn = true;
        state.error = 'Sign-in required';
        return state;
      }
    } catch (error) {
      showDebugOverlay(`✅ No sign-in wall detected`, 'success');
      // No sign-in needed (good)
    }
  }

  // Check for rate limit
  if (selectors.limit_detect) {
    showDebugOverlay(`🔍 Checking for rate limits...`, 'info');
    try {
      const limitElement = await findElement(selectors.limit_detect, 2000);
      if (limitElement) {
        showDebugOverlay(`⚠️ Rate limit detected`, 'warning');
        state.rateLimited = true;
        state.error = 'Rate limit reached';
        return state;
      }
    } catch (error) {
      showDebugOverlay(`✅ No rate limits`, 'success');
      // No rate limit (good)
    }
  }

  // Check if input is available
  try {
    showDebugOverlay(`🔍 Looking for input element (timeout: 12s)...`, 'info');
    const inputElement = await findElement(selectors.input, 12000);
    if (inputElement) {
      showDebugOverlay(`✅ Page is ready!`, 'success');
      state.ready = true;
      return state;
    }
  } catch (error) {
    showDebugOverlay(`💀 Input check failed after 12s`, 'error');
    state.error = 'Input element not found';
    return state;
  }

  return state;
}

// ============================================================
// PROMPT INJECTION: Type & Submit with Retry Logic
// ============================================================

async function injectPrompt(prompt, selectors, options = {}) {
  if (injectionState.isInjecting) {
    throw new Error('Injection already in progress');
  }

  showDebugOverlay(`🚀 Starting injection: "${prompt.substring(0, 50)}..."`, 'info');
  
  injectionState.isInjecting = true;
  injectionState.currentPrompt = prompt;

  try {
    // 1. Detect page state
    showDebugOverlay(`🔍 Detecting page state...`, 'info');
    const pageState = await detectPageState(selectors);
    
    if (!pageState.ready) {
      showDebugOverlay(`❌ Page not ready: ${pageState.error}`, 'error');
      // Return detailed error for UI display
      return {
        success: false,
        error: pageState.error,
        needsSignIn: pageState.needsSignIn,
        rateLimited: pageState.rateLimited,
        userAction: pageState.needsSignIn 
          ? 'Please log in to this platform first' 
          : pageState.rateLimited 
          ? 'Rate limit reached. Try again in 1-4 hours'
          : 'Platform not ready. Refresh the page and try again'
      };
    }

    // 2. Find input element with detailed failure reporting
    showDebugOverlay(`🔍 Finding input element...`, 'info');
    let inputElement;
    try {
      inputElement = await findElement(selectors.input);
      showDebugOverlay(`✅ Input element found!`, 'success');
    } catch (error) {
      // All selectors exhausted - report which ones failed
      console.error('[PromptCast] All input selectors failed:', selectors.input);
      showDebugOverlay(`💀 Input not found. Tried: ${selectors.input.join(', ')}`, 'error');
      
      // Report to background for telemetry
      chrome.runtime.sendMessage({
        action: 'reportFailure',
        platform: injectionState.platform,
        reason: 'input_selectors_exhausted',
        attempted: selectors.input
      });

      return {
        success: false,
        error: 'Input box not found',
        userAction: 'Platform UI may have changed. Check for extension updates.',
        selectorsFailed: selectors.input,
        recoverySuggestion: 'Try refreshing the page or opening a new chat'
      };
    }
    
    // 3. Clear existing content
    showDebugOverlay(`🧹 Clearing input...`, 'info');
    await clearInput(inputElement);

    // 4. Type prompt (with realistic typing simulation)
    showDebugOverlay(`⌨️ Typing prompt...`, 'info');
    await typeText(inputElement, prompt, options.simulateTyping !== false);
    showDebugOverlay(`✅ Prompt typed successfully`, 'success');

    // 5. Find and click send button with detailed failure reporting
    showDebugOverlay(`🔍 Finding send button...`, 'info');
    let sendButton;
    try {
      sendButton = await findElement(selectors.send);
      showDebugOverlay(`✅ Send button found!`, 'success');
    } catch (error) {
      console.error('[PromptCast] All send button selectors failed:', selectors.send);
      showDebugOverlay(`💀 Send button not found. Tried: ${selectors.send.join(', ')}`, 'error');
      
      chrome.runtime.sendMessage({
        action: 'reportFailure',
        platform: injectionState.platform,
        reason: 'send_button_selectors_exhausted',
        attempted: selectors.send
      });

      return {
        success: false,
        error: 'Send button not found',
        userAction: 'Prompt was typed but not sent. Please click Send manually.',
        selectorsFailed: selectors.send,
        partialSuccess: true // Prompt was injected
      };
    }
    
    // Ensure button is enabled
    if (sendButton.disabled || sendButton.getAttribute('aria-disabled') === 'true') {
      showDebugOverlay(`⚠️ Send button is disabled`, 'warning');
      return {
        success: false,
        error: 'Send button is disabled',
        userAction: 'Prompt was typed but button is disabled. Check if input is valid.',
        partialSuccess: true
      };
    }

    showDebugOverlay(`🖱️ Clicking send button...`, 'info');
    sendButton.click();
    showDebugOverlay(`🎉 SUCCESS! Prompt injected and sent`, 'success');

    console.log('[PromptCast] Prompt injected successfully');

    // 6. Start response harvesting (if enabled)
    if (options.harvestResponse !== false) {
      showDebugOverlay(`👂 Starting response harvesting...`, 'info');
      startResponseHarvesting(selectors);
    }

    return {
      success: true,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('[PromptCast] Injection failed:', error);
    
    // Report failure to background with context
    chrome.runtime.sendMessage({
      action: 'reportFailure',
      platform: injectionState.platform,
      reason: 'unexpected_error',
      errorMessage: error.message
    });

    return {
      success: false,
      error: error.message,
      userAction: 'Unexpected error occurred. Try refreshing the page.',
      technicalDetails: error.stack
    };
  } finally {
    injectionState.isInjecting = false;
  }
}

async function clearInput(element) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (element.isContentEditable) {
    element.textContent = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

async function typeText(element, text, simulate = true) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    if (simulate) {
      // Realistic typing simulation
      for (let i = 0; i < text.length; i++) {
        element.value += text[i];
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(Math.random() * 20 + 5); // 5-25ms per character
      }
    } else {
      // Fast paste
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (element.isContentEditable) {
    // ContentEditable (Gemini, Claude)
    element.textContent = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Trigger any framework-specific events
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

// ============================================================
// RESPONSE HARVESTING: Extract AI Output
// ============================================================

function startResponseHarvesting(selectors) {
  // Platform-specific response selectors with TESTED patterns
  const responseSelectors = {
    kimi: {
      container: ['.message-content', '[data-testid="message"]', 'div[class*="message"]'],
      stopButton: ['button[aria-label*="Stop"]', 'button:contains("停止")'],
      streamingIndicator: ['div[class*="typing"]', 'span[class*="cursor"]']
    },
    chatgpt: {
      container: ['[data-message-author-role="assistant"]', 'div[class*="agent-turn"]', '.markdown'],
      stopButton: ['button[aria-label="Stop generating"]', 'button[data-testid="stop-button"]'],
      streamingIndicator: ['div.result-streaming', 'div[class*="streaming"]']
    },
    gemini: {
      container: ['message-content', 'model-response', '[data-test-id="response"]'],
      stopButton: ['button[aria-label*="Stop"]'],
      streamingIndicator: ['mat-spinner', 'div[class*="loading"]']
    },
    claude: {
      container: ['.font-claude-message', '[data-testid="message-content"]', 'div[class*="Message"]'],
      stopButton: ['button[aria-label*="Stop"]'],
      streamingIndicator: ['div[class*="streaming"]']
    }
  };

  const platform = injectionState.platform;
  const config = responseSelectors[platform] || {
    container: ['.response', '.message', 'div[class*="response"]'],
    stopButton: ['button:contains("Stop")'],
    streamingIndicator: ['div[class*="loading"]']
  };

  let lastResponseLength = 0;
  let stabilityCheckCount = 0;
  let responseElement = null;

  // Use MutationObserver to detect when response appears
  injectionState.responseObserver = new MutationObserver(async (mutations) => {
    // Find response container if not found yet
    if (!responseElement) {
      for (const selector of config.container) {
        const el = document.querySelector(selector);
        if (el && el.textContent.length > 50) {
          responseElement = el;
          console.log('[PromptCast] Found response container:', selector);
          break;
        }
      }
    }

    if (!responseElement) return;

    // Detect if streaming is complete
    const currentLength = responseElement.textContent.length;
    const isStopButtonGone = !config.stopButton.some(s => document.querySelector(s));
    const isStreamingIndicatorGone = !config.streamingIndicator.some(s => document.querySelector(s));

    // Response is "done" when:
    // 1. Length hasn't changed for 3 consecutive checks (1.5 seconds)
    // 2. Stop button disappeared
    // 3. Streaming indicator disappeared
    if (currentLength === lastResponseLength) {
      stabilityCheckCount++;
      
      if (stabilityCheckCount >= 3 || (isStopButtonGone && isStreamingIndicatorGone)) {
        // Response is complete
        console.log('[PromptCast] Response complete. Length:', currentLength);
        await harvestResponse(responseElement);
        
        // Disconnect observer
        if (injectionState.responseObserver) {
          injectionState.responseObserver.disconnect();
          injectionState.responseObserver = null;
        }
      }
    } else {
      // Response still growing
      lastResponseLength = currentLength;
      stabilityCheckCount = 0;
    }
  });

  injectionState.responseObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Timeout after 3 minutes (some responses are very long)
  setTimeout(() => {
    if (injectionState.responseObserver) {
      console.log('[PromptCast] Response harvesting timeout');
      if (responseElement) {
        harvestResponse(responseElement); // Harvest whatever we got
      }
      injectionState.responseObserver.disconnect();
      injectionState.responseObserver = null;
    }
  }, 180000);
}

async function harvestResponse(element) {
  // Yield to main thread for large responses
  const text = await extractTextInChunks(element);
  
  // Send back to extension
  chrome.runtime.sendMessage({
    action: 'responseHarvested',
    platform: injectionState.platform,
    prompt: injectionState.currentPrompt,
    response: text,
    timestamp: Date.now()
  });

  // Disconnect observer
  if (injectionState.responseObserver) {
    injectionState.responseObserver.disconnect();
    injectionState.responseObserver = null;
  }

  console.log('[PromptCast] Response harvested:', text.length, 'characters');
}

async function extractTextInChunks(element) {
  const CHUNK_SIZE = 5000;
  const fullText = element.textContent || element.innerText;
  let extracted = '';
  
  for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
    extracted += fullText.slice(i, i + CHUNK_SIZE);
    await sleep(0); // Yield to main thread
  }
  
  return extracted;
}

// ============================================================
// MESSAGE HANDLER
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectPrompt') {
    showDebugOverlay(`📨 Received injection command for ${message.platform}`, 'info');
    
    injectionState.platform = message.platform;
    injectionState.selectors = message.selectors;
    
    injectPrompt(message.prompt, message.selectors, message.options)
      .then(sendResponse)
      .catch(error => {
        showDebugOverlay(`💥 Injection failed: ${error.message}`, 'error');
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep channel open for async response
  }

  if (message.action === 'getPageState') {
    detectPageState(message.selectors)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    
    return true;
  }

  if (message.action === 'clearInput') {
    findElement(message.selectors.input)
      .then(clearInput)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true;
  }
});

// ============================================================
// UTILITIES
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// AUTO-DETECTION: Report Health Status
// ============================================================

(async function healthCheck() {
  // Detect which platform we're on
  const hostname = window.location.hostname;
  const platformMap = {
    'kimi.ai': 'kimi',
    'kimi.moonshot.cn': 'kimi',
    'chat.openai.com': 'chatgpt',
    'gemini.google.com': 'gemini',
    'claude.ai': 'claude',
    'perplexity.ai': 'perplexity'
  };

  const detectedPlatform = platformMap[hostname];
  if (!detectedPlatform) return;

  // Get selectors for this platform
  const response = await chrome.runtime.sendMessage({ action: 'getSelectors' });
  if (!response || !response.platforms) return;

  const selectors = response.platforms[detectedPlatform];
  if (!selectors) return;

  // Check page state and report
  const state = await detectPageState(selectors);
  
  console.log('[PromptCast] Health check:', {
    platform: detectedPlatform,
    ready: state.ready,
    error: state.error
  });
})();

console.log('[PromptCast] Content script loaded');
