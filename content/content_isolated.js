/**
 * Super Allow Copy & Paste Pro - Isolated Content Script
 * Manages DOM styles, mutation observers, storage sync, keyboard shortcuts,
 * visual element extraction, and runtime messaging.
 */

(function () {
  'use strict';

  if (window.__SUPER_ALLOW_COPY_PASTE_ISOLATED_INITIALIZED__) return;
  window.__SUPER_ALLOW_COPY_PASTE_ISOLATED_INITIALIZED__ = true;

  // Global & Per-domain default settings
  const DEFAULT_SETTINGS = {
    globalEnabled: true,
    forceMode: false,
    allowCopy: true,
    allowPaste: true,
    allowContextMenu: true,
    allowSelection: true,
    allowDrag: true,
    allowShortcuts: true,
    stripWatermark: true,
    bypassVisibility: false,
    showToasts: true,
    domainOverrides: {} // { "example.com": { enabled: true, forceMode: true } }
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let currentDomain = window.location.hostname || 'localhost';
  let isEffectiveEnabled = true;
  let isEffectiveForceMode = false;
  let mutationObserver = null;
  let styleElement = null;

  /**
   * CSS rules to force unlock selection and mouse interactions
   */
  const UNLOCK_CSS = `
    /* Super Allow Copy & Paste Pro - Core Unblock Rules */
    *, *::before, *::after {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;
    }

    input, textarea, [contenteditable="true"], [contenteditable=""] {
      -webkit-user-select: auto !important;
      -moz-user-select: auto !important;
      -ms-user-select: auto !important;
      user-select: auto !important;
      pointer-events: auto !important;
    }

    /* Selection highlight enhancement */
    ::selection {
      background-color: #3b82f6 !important;
      color: #ffffff !important;
    }
    ::-moz-selection {
      background-color: #3b82f6 !important;
      color: #ffffff !important;
    }
  `;

  const FORCE_MODE_EXTRA_CSS = `
    /* Force Mode: Neutralize blocking transparent overlays and click shields */
    [class*="protect"], [class*="no-copy"], [class*="nocopy"],
    [id*="protect"], [id*="no-copy"], [id*="nocopy"],
    [class*="unselectable"], [unselectable="on"] {
      user-select: text !important;
      pointer-events: auto !important;
    }
  `;

  /**
   * Initialize and synchronize storage
   */
  function init() {
    loadSettings(() => {
      applyCurrentState();
      setupEventListeners();
      setupMutationObserver();
      notifyMainWorld();
    });

    // Listen for storage changes in real time (e.g. from popup or options)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' || areaName === 'local') {
        loadSettings(() => {
          applyCurrentState();
          notifyMainWorld();
        });
      }
    });

    // Listen for main script ready announcement
    window.addEventListener('__SUPER_ALLOW_COPY_PASTE_MAIN_READY__', () => {
      notifyMainWorld();
    });
  }

  /**
   * Calculate effective state for current domain
   */
  function calculateEffectiveState() {
    const override = currentSettings.domainOverrides[currentDomain];
    if (override && typeof override.enabled === 'boolean') {
      isEffectiveEnabled = override.enabled;
      isEffectiveForceMode = override.forceMode ?? currentSettings.forceMode;
    } else {
      isEffectiveEnabled = currentSettings.globalEnabled;
      isEffectiveForceMode = currentSettings.forceMode;
    }
  }

  /**
   * Load settings from chrome storage
   */
  function loadSettings(callback) {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime.lastError) {
        chrome.storage.local.get(DEFAULT_SETTINGS, (localItems) => {
          currentSettings = { ...DEFAULT_SETTINGS, ...localItems };
          calculateEffectiveState();
          if (callback) callback();
        });
      } else {
        currentSettings = { ...DEFAULT_SETTINGS, ...items };
        calculateEffectiveState();
        if (callback) callback();
      }
    });
  }

  /**
   * Apply CSS and DOM state
   */
  function applyCurrentState() {
    calculateEffectiveState();

    if (isEffectiveEnabled && currentSettings.allowSelection) {
      injectStyles();
      cleanDOMAttributes(document.body || document.documentElement);
    } else {
      removeStyles();
    }
  }

  /**
   * Inject CSS styles into head
   */
  function injectStyles() {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'super-allow-copy-paste-styles';
      styleElement.type = 'text/css';
    }

    const cssContent = isEffectiveForceMode ? UNLOCK_CSS + '\n' + FORCE_MODE_EXTRA_CSS : UNLOCK_CSS;
    if (styleElement.textContent !== cssContent) {
      styleElement.textContent = cssContent;
    }

    const target = document.head || document.documentElement;
    if (target && !document.getElementById('super-allow-copy-paste-styles')) {
      target.appendChild(styleElement);
    }
  }

  /**
   * Remove CSS styles
   */
  function removeStyles() {
    const el = document.getElementById('super-allow-copy-paste-styles');
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  /**
   * Notify MAIN world script of current settings
   */
  function notifyMainWorld() {
    window.dispatchEvent(
      new CustomEvent('__SUPER_ALLOW_COPY_PASTE_UPDATE_CONFIG__', {
        detail: {
          enabled: isEffectiveEnabled,
          forceMode: isEffectiveForceMode,
          allowCopy: currentSettings.allowCopy,
          allowPaste: currentSettings.allowPaste,
          allowContextMenu: currentSettings.allowContextMenu,
          allowSelection: currentSettings.allowSelection,
          allowDrag: currentSettings.allowDrag,
          allowShortcuts: currentSettings.allowShortcuts,
          stripWatermark: currentSettings.stripWatermark,
          bypassVisibility: currentSettings.bypassVisibility
        }
      })
    );
  }

  /**
   * Strip inline blocking attributes from element and children
   */
  const BLOCKING_ATTRIBUTES = [
    'oncopy',
    'oncut',
    'onpaste',
    'onbeforecopy',
    'onbeforecut',
    'onbeforepaste',
    'oncontextmenu',
    'onselectstart',
    'onselect',
    'ondragstart',
    'unselectable'
  ];

  function cleanElementAttributes(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

    for (let i = 0; i < BLOCKING_ATTRIBUTES.length; i++) {
      const attr = BLOCKING_ATTRIBUTES[i];
      if (el.hasAttribute(attr)) {
        el.removeAttribute(attr);
      }
    }

    // Remove inline style restrictions
    if (el.style) {
      if (el.style.userSelect === 'none' || el.style.webkitUserSelect === 'none') {
        el.style.userSelect = 'text';
        el.style.webkitUserSelect = 'text';
      }
    }

    // In Force Mode, unblock disabled/readonly inputs if requested
    if (isEffectiveForceMode && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      if (el.getAttribute('data-unblocked-paste') !== 'true') {
        el.setAttribute('data-unblocked-paste', 'true');
        el.addEventListener('paste', (e) => e.stopPropagation(), { capture: true });
      }
    }
  }

  function cleanDOMAttributes(root) {
    if (!root) return;
    cleanElementAttributes(root);
    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (let i = 0; i < elements.length; i++) {
      cleanElementAttributes(elements[i]);
    }
  }

  /**
   * Setup MutationObserver for dynamic SPAs
   */
  function setupMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    let timeout = null;
    mutationObserver = new MutationObserver((mutations) => {
      if (!isEffectiveEnabled) return;

      if (timeout) return;
      timeout = setTimeout(() => {
        timeout = null;
        for (let i = 0; i < mutations.length; i++) {
          const mutation = mutations[i];
          if (mutation.type === 'childList') {
            for (let j = 0; j < mutation.addedNodes.length; j++) {
              cleanDOMAttributes(mutation.addedNodes[j]);
            }
          } else if (mutation.type === 'attributes') {
            cleanElementAttributes(mutation.target);
          }
        }
      }, 100);
    });

    const target = document.body || document.documentElement;
    if (target) {
      mutationObserver.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: BLOCKING_ATTRIBUTES.concat(['style', 'class'])
      });
    }
  }

  /**
   * Setup capturing event listeners to enforce user rights before page handlers
   */
  function setupEventListeners() {
    // Prevent context menu blocking
    window.addEventListener(
      'contextmenu',
      (e) => {
        if (isEffectiveEnabled && currentSettings.allowContextMenu) {
          e.stopImmediatePropagation();
        }
      },
      true
    );

    // Prevent copy/cut blocking
    const allowCopyHandler = (e) => {
      if (isEffectiveEnabled && currentSettings.allowCopy) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('copy', allowCopyHandler, true);
    window.addEventListener('cut', allowCopyHandler, true);

    // Prevent paste blocking
    window.addEventListener(
      'paste',
      (e) => {
        if (isEffectiveEnabled && currentSettings.allowPaste) {
          e.stopImmediatePropagation();
        }
      },
      true
    );

    // Prevent select start blocking
    window.addEventListener(
      'selectstart',
      (e) => {
        if (isEffectiveEnabled && currentSettings.allowSelection) {
          e.stopImmediatePropagation();
        }
      },
      true
    );

    // Prevent drag start blocking
    window.addEventListener(
      'dragstart',
      (e) => {
        if (isEffectiveEnabled && currentSettings.allowDrag) {
          e.stopImmediatePropagation();
        }
      },
      true
    );

    // Unblock shortcuts (Ctrl+C, Ctrl+V, Ctrl+A, F12, etc.)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!isEffectiveEnabled || !currentSettings.allowShortcuts) return;

        const k = (e.key || '').toLowerCase();
        const isCtrlOrMeta = e.ctrlKey || e.metaKey;

        // F12 or devtools or copy/paste
        if (e.keyCode === 123 || k === 'f12' || (isCtrlOrMeta && ['c', 'v', 'x', 'a', 'u', 's', 'p'].includes(k))) {
          e.stopImmediatePropagation();
        }
      },
      true
    );
  }

  /**
   * Sleek Toast Notification
   */
  function showToast(message, type = 'info') {
    if (!currentSettings.showToasts) return;

    let toast = document.getElementById('super-allow-copy-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'super-allow-copy-toast';
      document.documentElement.appendChild(toast);
    }

    const icons = {
      success: '✓',
      info: '⚡',
      warning: '🛡️',
      error: '✕'
    };

    toast.innerHTML = `
      <div class="sacp-toast-content sacp-${type}">
        <span class="sacp-icon">${icons[type] || '⚡'}</span>
        <span class="sacp-text">${message}</span>
      </div>
    `;

    toast.className = 'sacp-toast-visible';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.className = 'sacp-toast-hidden';
    }, 2400);
  }

  /**
   * Listen for messages from background / popup
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;

    switch (message.action) {
      case 'GET_PAGE_STATUS':
        sendResponse({
          domain: currentDomain,
          enabled: isEffectiveEnabled,
          forceMode: isEffectiveForceMode,
          settings: currentSettings
        });
        break;

      case 'TOGGLE_SITE_ENABLED':
        toggleSiteEnabled();
        sendResponse({ success: true, enabled: isEffectiveEnabled });
        break;

      case 'TOGGLE_FORCE_MODE':
        toggleForceMode();
        sendResponse({ success: true, forceMode: isEffectiveForceMode });
        break;

      case 'TRIGGER_ELEMENT_PICKER':
        if (window.__SACP_START_PICKER__) {
          window.__SACP_START_PICKER__();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Picker not loaded' });
        }
        break;

      case 'FORCE_COPY_SELECTION':
        const selected = window.getSelection ? window.getSelection().toString() : '';
        if (selected) {
          navigator.clipboard.writeText(selected).then(() => {
            showToast('Texto copiado com sucesso!', 'success');
            sendResponse({ success: true, text: selected });
          }).catch(() => {
            sendResponse({ success: false });
          });
          return true; // asynchronous response
        } else {
          showToast('Nenhum texto selecionado.', 'warning');
          sendResponse({ success: false, error: 'No text selected' });
        }
        break;

      case 'UPDATE_SETTINGS':
        loadSettings(() => {
          applyCurrentState();
          notifyMainWorld();
          sendResponse({ success: true });
        });
        return true;
    }
  });

  /**
   * Helper toggles
   */
  function toggleSiteEnabled() {
    const overrides = { ...currentSettings.domainOverrides };
    const currentSiteState = overrides[currentDomain]?.enabled ?? currentSettings.globalEnabled;
    const newState = !currentSiteState;

    overrides[currentDomain] = {
      ...(overrides[currentDomain] || {}),
      enabled: newState
    };

    chrome.storage.sync.set({ domainOverrides: overrides }, () => {
      currentSettings.domainOverrides = overrides;
      applyCurrentState();
      notifyMainWorld();
      showToast(newState ? 'Desbloqueio Ativado neste site' : 'Desbloqueio Desativado neste site', newState ? 'success' : 'info');
    });
  }

  function toggleForceMode() {
    const overrides = { ...currentSettings.domainOverrides };
    const currentSiteForce = overrides[currentDomain]?.forceMode ?? currentSettings.forceMode;
    const newForceState = !currentSiteForce;

    overrides[currentDomain] = {
      ...(overrides[currentDomain] || {}),
      forceMode: newForceState
    };

    chrome.storage.sync.set({ domainOverrides: overrides }, () => {
      currentSettings.domainOverrides = overrides;
      applyCurrentState();
      notifyMainWorld();
      showToast(newForceState ? '⚡ Modo Força Bruta (Ultra) Ativado!' : 'Modo Inteligente Ativado', newForceState ? 'warning' : 'info');
    });
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
