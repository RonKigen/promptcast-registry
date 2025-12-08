// PromptCast Popup - Unified AI Dashboard

const PLATFORMS = {
  kimi: { name: 'Kimi', color: '#00C9A7', icon: '🤖' },
  chatgpt: { name: 'ChatGPT', color: '#10A37F', icon: '💬' },
  gemini: { name: 'Gemini', color: '#4285F4', icon: '✨' },
  claude: { name: 'Claude', color: '#D97757', icon: '🧠' },
  perplexity: { name: 'Perplexity', color: '#20808D', icon: '🔍' },
  deepseek: { name: 'DeepSeek', color: '#1E90FF', icon: '🔬' },
  groq: { name: 'Groq', color: '#F55036', icon: '⚡' },
  mistral: { name: 'Mistral', color: '#FF7000', icon: '🌪️' },
  pi: { name: 'Pi', color: '#8B5CF6', icon: '🥧' },
  huggingface: { name: 'HuggingChat', color: '#FFD21E', icon: '🤗' },
  openrouter: { name: 'OpenRouter', color: '#5B21B6', icon: '🔀' },
  poe: { name: 'Poe', color: '#FF4757', icon: '🦜' },
  cline: { name: 'Cline', color: '#06B6D4', icon: '🛠️' },
  cursor: { name: 'Cursor', color: '#000000', icon: '▶️' },
  blackbox: { name: 'Blackbox', color: '#1A1A1A', icon: '⬛' },
  phind: { name: 'Phind', color: '#4F46E5', icon: '🔎' },
  replit: { name: 'Replit', color: '#F26207', icon: '🔄' },
  ideogram: { name: 'Ideogram', color: '#9333EA', icon: '🎨' },
  midjourney: { name: 'Midjourney', color: '#34D399', icon: '🖼️' },
  leonardo: { name: 'Leonardo', color: '#EC4899', icon: '🎭' },
  you: { name: 'You.com', color: '#0EA5E9', icon: '🔦' },
  andi: { name: 'Andi', color: '#8B5CF6', icon: '🔮' }
};

let state = {
  selectedPlatforms: [],
  currentPrompt: '',
  history: [],
  responses: new Map(),
  isInjecting: false
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  renderPlatforms();
  renderHistory();
  updatePrivacyAudit();
  checkSelectorStatus();
  setupEventListeners();
  loadResponses();
});

async function loadState() {
  const data = await chrome.storage.sync.get([
    'selectedPlatforms',
    'defaultPlatforms'
  ]);

  const localData = await chrome.storage.local.get([
    'promptHistory',
    'responses'
  ]);

  state.selectedPlatforms = data.selectedPlatforms || data.defaultPlatforms || ['chatgpt', 'gemini'];
  state.history = localData.promptHistory || [];

  if (localData.responses) {
    state.responses = new Map(Object.entries(localData.responses));
  }
}

// ============================================================
// PLATFORM RENDERING
// ============================================================

function renderPlatforms() {
  const grid = document.getElementById('platform-grid');
  grid.innerHTML = '';

  Object.entries(PLATFORMS).forEach(([id, platform]) => {
    const card = document.createElement('div');
    card.className = 'platform-card';
    if (state.selectedPlatforms.includes(id)) {
      card.classList.add('selected');
    }

    card.innerHTML = `
      <input type="checkbox" 
             id="platform-${id}" 
             ${state.selectedPlatforms.includes(id) ? 'checked' : ''}>
      <div class="platform-icon" style="background: ${platform.color}">
        ${platform.icon}
      </div>
      <span class="platform-name">${platform.name}</span>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox') {
        const checkbox = card.querySelector('input');
        checkbox.checked = !checkbox.checked;
      }
      togglePlatform(id);
    });

    grid.appendChild(card);
  });
}

function togglePlatform(platformId) {
  const index = state.selectedPlatforms.indexOf(platformId);
  
  if (index > -1) {
    state.selectedPlatforms.splice(index, 1);
  } else {
    state.selectedPlatforms.push(platformId);
  }

  chrome.storage.sync.set({ selectedPlatforms: state.selectedPlatforms });
  renderPlatforms();
}

// ============================================================
// PROMPT HANDLING
// ============================================================

const promptInput = document.getElementById('prompt-input');
const charCount = document.getElementById('char-count');

promptInput.addEventListener('input', () => {
  state.currentPrompt = promptInput.value;
  charCount.textContent = `${promptInput.value.length} characters`;
});

document.getElementById('clear-btn').addEventListener('click', () => {
  promptInput.value = '';
  state.currentPrompt = '';
  charCount.textContent = '0 characters';
});

// ============================================================
// ACTION HANDLERS
// ============================================================

document.getElementById('launch-tabs-btn').addEventListener('click', async () => {
  if (state.selectedPlatforms.length === 0) {
    showStatus([{ platform: 'error', message: 'Please select at least one platform', type: 'error' }]);
    return;
  }

  // Just launch tabs without injecting
  for (const platformId of state.selectedPlatforms) {
    const platform = PLATFORMS[platformId];
    chrome.tabs.create({ url: platform.url || getDefaultUrl(platformId), active: false });
  }

  showStatus([{ platform: 'success', message: `Launched ${state.selectedPlatforms.length} tabs`, type: 'success' }]);
});

document.getElementById('launch-inject-btn').addEventListener('click', async () => {
  if (state.selectedPlatforms.length === 0) {
    showStatus([{ platform: 'error', message: 'Please select at least one platform', type: 'error' }]);
    return;
  }

  if (!state.currentPrompt.trim()) {
    showStatus([{ platform: 'error', message: 'Please enter a prompt', type: 'error' }]);
    return;
  }

  if (state.isInjecting) {
    return;
  }

  state.isInjecting = true;
  const launchBtn = document.getElementById('launch-inject-btn');
  launchBtn.disabled = true;
  launchBtn.innerHTML = '<span class="icon">⏳</span> Injecting...';

  try {
    // Save to history
    await saveToHistory(state.currentPrompt);

    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'launchAndInject',
      platforms: state.selectedPlatforms,
      prompt: state.currentPrompt,
      options: {
        harvestResponse: true,
        simulateTyping: false
      }
    });

    // Display results
    const statuses = response.results.map(r => ({
      platform: r.platformId,
      message: r.success ? 'Prompt injected successfully' : r.error,
      type: r.success ? 'success' : 'error',
      needsSignIn: r.response?.needsSignIn,
      rateLimited: r.response?.rateLimited
    }));

    showStatus(statuses);

    // Clear input
    promptInput.value = '';
    state.currentPrompt = '';
    charCount.textContent = '0 characters';

  } catch (error) {
    showStatus([{ platform: 'error', message: error.message, type: 'error' }]);
  } finally {
    state.isInjecting = false;
    launchBtn.disabled = false;
    launchBtn.innerHTML = '<span class="icon">⚡</span> Launch + Inject Prompt';
  }
});

function getDefaultUrl(platformId) {
  const urls = {
    kimi: 'https://www.kimi.com/',
    chatgpt: 'https://chatgpt.com/',
    gemini: 'https://gemini.google.com/app',
    claude: 'https://claude.ai/',
    perplexity: 'https://www.perplexity.ai/',
    deepseek: 'https://chat.deepseek.com/',
    groq: 'https://groq.com/',
    mistral: 'https://chat.mistral.ai/',
    pi: 'https://pi.ai/',
    huggingface: 'https://huggingface.co/chat/',
    openrouter: 'https://openrouter.ai/chat/',
    poe: 'https://poe.com/',
    cline: 'https://cline.bot/',
    cursor: 'https://www.cursor.com/',
    blackbox: 'https://www.blackbox.ai/',
    phind: 'https://www.phind.com/',
    replit: 'https://replit.com/',
    ideogram: 'https://ideogram.ai/',
    midjourney: 'https://www.midjourney.com/',
    leonardo: 'https://leonardo.ai/',
    you: 'https://you.com/',
    andi: 'https://andisearch.com/'
  };
  return urls[platformId];
}

// ============================================================
// STATUS DISPLAY
// ============================================================

function showStatus(statuses) {
  const section = document.getElementById('status-section');
  const list = document.getElementById('status-list');
  
  section.style.display = 'block';
  list.innerHTML = '';

  statuses.forEach(status => {
    const item = document.createElement('div');
    item.className = `status-item ${status.type}`;
    
    let icon = '✓';
    if (status.type === 'error') icon = '✗';
    if (status.type === 'warning') icon = '⚠';

    // Build detailed message
    let message = status.message;
    
    // Add user action if provided
    if (status.response?.userAction) {
      message = `${message}<br><small>${status.response.userAction}</small>`;
    }
    
    // Add recovery suggestion for partial success
    if (status.response?.partialSuccess) {
      message = `${message}<br><small>✓ Prompt was typed successfully</small>`;
    }

    // Show which selectors failed (for developers)
    if (status.response?.selectorsFailed && status.response.selectorsFailed.length > 0) {
      const selectorHint = status.response.selectorsFailed[0];
      message = `${message}<br><small style="opacity: 0.7">Failed selector: ${selectorHint}</small>`;
    }

    item.innerHTML = `
      <span class="icon">${icon}</span>
      <div style="flex: 1;">
        <strong>${PLATFORMS[status.platform]?.name || 'System'}:</strong> ${message}
      </div>
    `;

    list.appendChild(item);
  });

  // Don't auto-hide errors - user needs to see them
  const hasErrors = statuses.some(s => s.type === 'error');
  if (!hasErrors) {
    setTimeout(() => {
      section.style.display = 'none';
    }, 5000);
  }
}

// ============================================================
// HISTORY MANAGEMENT
// ============================================================

async function saveToHistory(prompt) {
  state.history.unshift({
    text: prompt,
    timestamp: Date.now(),
    platforms: [...state.selectedPlatforms]
  });

  // Keep only last 20
  if (state.history.length > 20) {
    state.history = state.history.slice(0, 20);
  }

  // Check storage quota BEFORE writing
  try {
    await enforceStorageQuota();
    await chrome.storage.local.set({ promptHistory: state.history });
    renderHistory();
    updatePrivacyAudit();
  } catch (error) {
    if (error.message.includes('QUOTA_BYTES')) {
      // Storage full - emergency cleanup
      console.error('[PromptCast] Storage quota exceeded');
      await emergencyStorageCleanup();
      // Retry save
      await chrome.storage.local.set({ promptHistory: state.history });
      
      // Warn user
      showStatus([{
        platform: 'warning',
        message: 'Storage nearly full. Old data was cleaned up.',
        type: 'warning'
      }]);
    } else {
      throw error;
    }
  }
}

async function enforceStorageQuota() {
  // Check current storage usage
  const bytes = await chrome.storage.local.getBytesInUse();
  const QUOTA_BYTES = 5 * 1024 * 1024; // 5MB
  const WARNING_THRESHOLD = 0.8; // 80%
  const CRITICAL_THRESHOLD = 0.95; // 95%

  console.log(`[PromptCast] Storage usage: ${(bytes / QUOTA_BYTES * 100).toFixed(1)}%`);

  if (bytes > QUOTA_BYTES * CRITICAL_THRESHOLD) {
    console.warn('[PromptCast] Critical storage threshold reached');
    await emergencyStorageCleanup();
  } else if (bytes > QUOTA_BYTES * WARNING_THRESHOLD) {
    console.warn('[PromptCast] Storage warning threshold reached');
    await gentleStorageCleanup();
  }
}

async function gentleStorageCleanup() {
  // Remove oldest 50% of history
  state.history = state.history.slice(0, Math.ceil(state.history.length / 2));
  await chrome.storage.local.set({ promptHistory: state.history });
  
  // Remove oldest 50% of responses
  const sortedResponses = Array.from(state.responses.entries())
    .sort((a, b) => b[1].timestamp - a[1].timestamp);
  
  state.responses = new Map(sortedResponses.slice(0, Math.ceil(sortedResponses.length / 2)));
  await chrome.storage.local.set({ responses: Object.fromEntries(state.responses) });
  
  console.log('[PromptCast] Gentle cleanup complete');
}

async function emergencyStorageCleanup() {
  // Keep only last 5 prompts
  state.history = state.history.slice(0, 5);
  await chrome.storage.local.set({ promptHistory: state.history });
  
  // Keep only last 3 responses
  const sortedResponses = Array.from(state.responses.entries())
    .sort((a, b) => b[1].timestamp - a[1].timestamp);
  
  state.responses = new Map(sortedResponses.slice(0, 3));
  await chrome.storage.local.set({ responses: Object.fromEntries(state.responses) });
  
  // Clear any orphaned keys
  const allKeys = await chrome.storage.local.get();
  const keysToRemove = Object.keys(allKeys).filter(k => 
    !['promptHistory', 'responses', 'selectors', 'selectors_etag', 'selectors_timestamp'].includes(k)
  );
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log('[PromptCast] Removed orphaned keys:', keysToRemove);
  }
  
  console.log('[PromptCast] Emergency cleanup complete');
}

function renderHistory() {
  const list = document.getElementById('history-list');
  
  if (state.history.length === 0) {
    list.innerHTML = '<div class="empty-state">No recent prompts</div>';
    return;
  }

  list.innerHTML = '';

  state.history.slice(0, 5).forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const date = new Date(item.timestamp);
    const timeAgo = getTimeAgo(date);

    historyItem.innerHTML = `
      <span class="history-text">${escapeHtml(item.text)}</span>
      <span class="history-date">${timeAgo}</span>
    `;

    historyItem.addEventListener('click', () => {
      promptInput.value = item.text;
      state.currentPrompt = item.text;
      charCount.textContent = `${item.text.length} characters`;
      
      // Restore platform selection
      state.selectedPlatforms = item.platforms;
      chrome.storage.sync.set({ selectedPlatforms: state.selectedPlatforms });
      renderPlatforms();
    });

    list.appendChild(historyItem);
  });
}

document.getElementById('clear-history-btn').addEventListener('click', async () => {
  if (confirm('Clear all prompt history?')) {
    state.history = [];
    await chrome.storage.local.set({ promptHistory: [] });
    renderHistory();
    updatePrivacyAudit();
  }
});

// ============================================================
// RESPONSE INBOX
// ============================================================

function loadResponses() {
  // Listen for harvested responses
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'responseHarvested') {
      addResponseToInbox(message);
    }
  });

  // Render existing responses
  renderInbox();
}

function addResponseToInbox(data) {
  const key = `${data.platform}_${data.timestamp}`;
  state.responses.set(key, data);

  // Save to storage
  chrome.storage.local.set({
    responses: Object.fromEntries(state.responses)
  });

  renderInbox();
  updatePrivacyAudit();
}

function renderInbox() {
  const section = document.getElementById('inbox-section');
  const list = document.getElementById('inbox-list');

  if (state.responses.size === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';

  // Sort by timestamp (newest first)
  const sorted = Array.from(state.responses.entries())
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .slice(0, 10);

  sorted.forEach(([key, data]) => {
    const item = document.createElement('div');
    item.className = 'inbox-item';
    
    const platform = PLATFORMS[data.platform];
    const date = new Date(data.timestamp);

    item.innerHTML = `
      <div class="inbox-header">
        <span class="inbox-platform">${platform.icon} ${platform.name}</span>
        <span class="inbox-time">${date.toLocaleTimeString()}</span>
      </div>
      <div class="inbox-response">${escapeHtml(data.response.slice(0, 300))}${data.response.length > 300 ? '...' : ''}</div>
      <div class="inbox-actions">
        <button class="copy-response" data-key="${key}">Copy</button>
        <button class="export-response" data-key="${key}">Export</button>
        <button class="delete-response" data-key="${key}">Delete</button>
      </div>
    `;

    list.appendChild(item);
  });

  // Add event listeners
  document.querySelectorAll('.copy-response').forEach(btn => {
    btn.addEventListener('click', () => {
      const data = state.responses.get(btn.dataset.key);
      navigator.clipboard.writeText(data.response);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    });
  });

  document.querySelectorAll('.delete-response').forEach(btn => {
    btn.addEventListener('click', () => {
      state.responses.delete(btn.dataset.key);
      chrome.storage.local.set({ responses: Object.fromEntries(state.responses) });
      renderInbox();
      updatePrivacyAudit();
    });
  });
}

document.getElementById('toggle-inbox-btn').addEventListener('click', () => {
  const list = document.getElementById('inbox-list');
  const btn = document.getElementById('toggle-inbox-btn');
  
  if (list.style.display === 'none') {
    list.style.display = 'flex';
    btn.textContent = 'Hide';
  } else {
    list.style.display = 'none';
    btn.textContent = 'Show';
  }
});

// ============================================================
// PRIVACY AUDIT
// ============================================================

async function updatePrivacyAudit() {
  document.getElementById('prompt-count').textContent = state.history.length;
  document.getElementById('response-count').textContent = state.responses.size;

  const { selectors_timestamp } = await chrome.storage.local.get('selectors_timestamp');
  if (selectors_timestamp) {
    const date = new Date(selectors_timestamp);
    document.getElementById('last-update').textContent = date.toLocaleString();
  }
}

document.getElementById('toggle-privacy-btn').addEventListener('click', () => {
  const details = document.getElementById('privacy-details');
  const btn = document.getElementById('toggle-privacy-btn');
  
  if (details.style.display === 'none') {
    details.style.display = 'flex';
    btn.textContent = 'Hide';
  } else {
    details.style.display = 'none';
    btn.textContent = 'Show';
  }
});

document.getElementById('flush-all-btn').addEventListener('click', async () => {
  if (confirm('This will delete all local data including prompts and responses. Continue?')) {
    state.history = [];
    state.responses.clear();
    
    await chrome.storage.local.clear();
    await chrome.storage.sync.remove(['selectedPlatforms', 'defaultPlatforms']);
    
    renderHistory();
    renderInbox();
    updatePrivacyAudit();
    
    alert('All data flushed successfully');
  }
});

// ============================================================
// SELECTOR STATUS CHECK
// ============================================================

async function checkSelectorStatus() {
  const indicator = document.getElementById('status-indicator');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSelectors' });
    
    if (response && response.version) {
      indicator.classList.add('online');
      indicator.title = `Selectors v${response.version} (Updated: ${new Date(response.updated_at).toLocaleDateString()})`;
    } else {
      indicator.classList.add('offline');
      indicator.title = 'Using fallback selectors';
    }
  } catch (error) {
    indicator.classList.add('offline');
    indicator.title = 'Selector registry unreachable';
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
  // Keyboard shortcuts
  promptInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      document.getElementById('launch-inject-btn').click();
    }
  });

  // Auto-save prompt on window close
  window.addEventListener('beforeunload', () => {
    if (state.currentPrompt && !state.isInjecting) {
      chrome.storage.local.set({ draftPrompt: state.currentPrompt });
    }
  });

  // Restore draft on load
  chrome.storage.local.get('draftPrompt').then(({ draftPrompt }) => {
    if (draftPrompt) {
      promptInput.value = draftPrompt;
      state.currentPrompt = draftPrompt;
      charCount.textContent = `${draftPrompt.length} characters`;
      chrome.storage.local.remove('draftPrompt');
    }
  });
}

// ============================================================
// UTILITIES
// ============================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
