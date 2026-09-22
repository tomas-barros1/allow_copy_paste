/**
 * Super Allow Copy & Paste Pro - Main World Hook
 * Injected into the page's execution context at document_start.
 * Directly neutralizes event listener locks, inline event overrides,
 * prototype hijackings, and clipboard watermarks.
 */

(function () {
  'use strict';

  // Prevent double injection
  if (window.__SUPER_ALLOW_COPY_PASTE_MAIN_INITIALIZED__) return;
  window.__SUPER_ALLOW_COPY_PASTE_MAIN_INITIALIZED__ = true;

  // Active configuration state (starts disabled by default until loaded/enabled for domain)
  let config = {
    enabled: false,
    forceMode: false,
    allowCopy: true,
    allowPaste: true,
    allowContextMenu: true,
    allowSelection: true,
    allowDrag: true,
    allowShortcuts: true,
    stripWatermark: true,
    bypassVisibility: false
  };

  // Blocked event types we manage
  const TARGET_EVENTS = new Set([
    'copy',
    'cut',
    'paste',
    'beforecopy',
    'beforecut',
    'beforepaste',
    'contextmenu',
    'selectstart',
    'select',
    'selectionchange',
    'dragstart',
    'drag',
    'drop',
    'dragover'
  ]);

  // Blocked keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+U, Ctrl+S, Ctrl+P, Ctrl+Shift+I, F12)
  const BLOCKED_SHORTCUT_KEYS = new Set(['c', 'v', 'x', 'a', 'u', 's', 'p', 'i', 'j', 'c']);

  // Native prototypes reference cache
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  const originalPreventDefault = Event.prototype.preventDefault;
  const originalStopPropagation = Event.prototype.stopPropagation;
  const originalStopImmediatePropagation = Event.prototype.stopImmediatePropagation;
  const originalSetAttribute = Element.prototype.setAttribute;
  const originalSetData = DataTransfer.prototype.setData;

  /**
   * Helper: Checks if an event is user-initiated or legitimate interaction
   */
  function shouldBypassPrevention(event) {
    if (!config.enabled) return false;
    const type = event.type ? event.type.toLowerCase() : '';

    if (!TARGET_EVENTS.has(type)) {
      // Check keyboard events attempting to block copy/paste/inspector
      if ((type === 'keydown' || type === 'keyup' || type === 'keypress') && config.allowShortcuts) {
        const k = (event.key || '').toLowerCase();
        const code = (event.code || '').toLowerCase();
        const isCtrlOrMeta = event.ctrlKey || event.metaKey;

        if (event.keyCode === 123 || k === 'f12') return true; // F12 Developer Tools
        if (isCtrlOrMeta && BLOCKED_SHORTCUT_KEYS.has(k)) return true; // Ctrl+C, Ctrl+V, Ctrl+U, etc.
        if (isCtrlOrMeta && (event.shiftKey || event.altKey) && (k === 'i' || k === 'j' || k === 'c')) return true; // Devtools
      }
      return false;
    }

    if ((type === 'copy' || type === 'cut' || type === 'beforecopy' || type === 'beforecut') && config.allowCopy) return true;
    if ((type === 'paste' || type === 'beforepaste') && config.allowPaste) return true;
    if (type === 'contextmenu' && config.allowContextMenu) return true;
    if ((type === 'selectstart' || type === 'select' || type === 'selectionchange') && config.allowSelection) return true;
    if ((type === 'dragstart' || type === 'drag' || type === 'drop' || type === 'dragover') && config.allowDrag) return true;

    return false;
  }

  /**
   * 1. Override Event.prototype methods so page scripts cannot cancel allowed actions
   */
  Event.prototype.preventDefault = function () {
    if (shouldBypassPrevention(this)) {
      // In Force Mode or when unblocking, silently ignore preventDefault for blocked actions
      return;
    }
    return originalPreventDefault.apply(this, arguments);
  };

  Event.prototype.stopPropagation = function () {
    if (shouldBypassPrevention(this) && config.forceMode) {
      return;
    }
    return originalStopPropagation.apply(this, arguments);
  };

  Event.prototype.stopImmediatePropagation = function () {
    if (shouldBypassPrevention(this) && config.forceMode) {
      return;
    }
    return originalStopImmediatePropagation.apply(this, arguments);
  };

  /**
   * 2. Intercept EventTarget.prototype.addEventListener
   */
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    const lowerType = (type || '').toLowerCase();

    if (config.enabled && TARGET_EVENTS.has(lowerType)) {
      if (config.forceMode) {
        // In Force Mode, completely block registration of anti-user event listeners
        return;
      }

      // In Smart Mode, wrap listener to intercept malicious preventDefault
      if (typeof listener === 'function') {
        const wrappedListener = function (event) {
          try {
            return listener.apply(this, arguments);
          } catch (e) {
            // Ignore errors thrown by site's broken handler
          }
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
    }

    return originalAddEventListener.apply(this, arguments);
  };

  /**
   * 3. Intercept inline property event handlers (e.g. document.oncopy = ...)
   */
  const inlineProps = [
    'oncopy',
    'oncut',
    'onpaste',
    'onbeforecopy',
    'onbeforecut',
    'onbeforepaste',
    'oncontextmenu',
    'onselectstart',
    'onselect',
    'ondragstart'
  ];

  const targets = [
    window,
    document,
    Document.prototype,
    HTMLElement.prototype,
    SVGElement.prototype
  ];

  inlineProps.forEach((prop) => {
    targets.forEach((target) => {
      try {
        Object.defineProperty(target, prop, {
          configurable: true,
          enumerable: true,
          get() {
            return null;
          },
          set(val) {
            if (config.enabled && (config.forceMode || typeof val === 'function')) {
              // Ignore attempts to assign blocking inline functions
              return true;
            }
            return true;
          }
        });
      } catch (e) {
        // Property might be non-configurable on some targets
      }
    });
  });

  /**
   * 4. Intercept setAttribute for inline HTML attributes (e.g. el.setAttribute('oncopy', 'return false;'))
   */
  Element.prototype.setAttribute = function (name, value) {
    if (config.enabled) {
      const lowerName = (name || '').toLowerCase();
      if (lowerName.startsWith('on') && TARGET_EVENTS.has(lowerName.slice(2))) {
        return; // Skip setting anti-copy/paste inline attributes
      }
      if (lowerName === 'unselectable' && value === 'on') {
        return;
      }
      if (lowerName === 'onselectstart' || lowerName === 'oncontextmenu') {
        return;
      }
    }
    return originalSetAttribute.apply(this, arguments);
  };

  /**
   * 5. Clean Copy / Strip Annoying Copyright Watermarks
   * Neutralizes scripts injecting "Read more at: ..." or corrupting clipboard
   */
  DataTransfer.prototype.setData = function (format, data) {
    if (config.enabled && config.stripWatermark && format === 'text/plain') {
      try {
        const selection = window.getSelection ? window.getSelection().toString() : '';
        if (selection && selection.length > 0) {
          // If the page is trying to set text different from actual user selection by appending crap
          const dataStr = String(data);
          if (dataStr.length > selection.length && dataStr.includes(selection.trim())) {
            // Revert back to clean selection
            return originalSetData.call(this, format, selection);
          }
        }
      } catch (err) {
        // Fallback to normal setData
      }
    }
    return originalSetData.apply(this, arguments);
  };

  /**
   * 6. Bypass Anti-Cheat / Focus / Visibility detection (if enabled)
   */
  function applyVisibilityBypass() {
    if (!config.bypassVisibility) return;
    try {
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true
      });
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true
      });
      Object.defineProperty(document, 'webkitVisibilityState', {
        get: () => 'visible',
        configurable: true
      });

      const cancelEvent = (e) => e.stopImmediatePropagation();
      window.addEventListener('visibilitychange', cancelEvent, true);
      window.addEventListener('webkitvisibilitychange', cancelEvent, true);
      window.addEventListener('blur', cancelEvent, true);
      window.addEventListener('mouseleave', cancelEvent, true);
    } catch (e) {}
  }

  /**
   * 7. Listen for config updates from the Isolated Content Script
   */
  window.addEventListener('__SUPER_ALLOW_COPY_PASTE_UPDATE_CONFIG__', (event) => {
    if (event.detail && typeof event.detail === 'object') {
      Object.assign(config, event.detail);
      if (config.bypassVisibility) {
        applyVisibilityBypass();
      }
    }
  });

  // Announce ready to isolated world
  window.dispatchEvent(new CustomEvent('__SUPER_ALLOW_COPY_PASTE_MAIN_READY__'));

})();
