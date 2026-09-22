/**
 * Super Allow Copy & Paste Pro - Interactive Visual Element Picker & Extractor
 * Allows users to hover and click ANY element to instantly copy its text or HTML,
 * bypassing even the most stubborn overlays, canvas layers, and complex DOM locks.
 */

(function () {
  'use strict';

  let isPickerActive = false;
  let hoveredElement = null;
  let overlayBox = null;
  let infoBadge = null;

  /**
   * Inject picker styles
   */
  function ensurePickerStyles() {
    if (document.getElementById('sacp-picker-styles')) return;

    const style = document.createElement('style');
    style.id = 'sacp-picker-styles';
    style.textContent = `
      /* Toast Styles */
      #super-allow-copy-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      }
      .sacp-toast-hidden {
        opacity: 0;
        transform: translateY(12px) scale(0.95);
      }
      .sacp-toast-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .sacp-toast-content {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(12px);
        color: #f8fafc;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-weight: 500;
      }
      .sacp-toast-content.sacp-success {
        border-color: rgba(34, 197, 94, 0.4);
      }
      .sacp-toast-content.sacp-warning {
        border-color: rgba(245, 158, 11, 0.4);
      }
      .sacp-icon {
        font-size: 16px;
      }

      /* Element Picker Overlay */
      #sacp-picker-overlay {
        position: fixed;
        pointer-events: none;
        z-index: 2147483646;
        border: 2px solid #3b82f6;
        background: rgba(59, 130, 246, 0.15);
        border-radius: 4px;
        transition: all 0.08s ease-out;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 8px 20px rgba(59, 130, 246, 0.3);
      }

      #sacp-picker-badge {
        position: fixed;
        pointer-events: none;
        z-index: 2147483647;
        background: #1e293b;
        color: #ffffff;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-family: monospace;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        gap: 6px;
        align-items: center;
      }
      #sacp-picker-badge .tag {
        color: #60a5fa;
      }
      #sacp-picker-badge .hint {
        color: #94a3b8;
        font-size: 11px;
        font-family: sans-serif;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /**
   * Start the visual picker
   */
  function startPicker() {
    if (isPickerActive) {
      stopPicker();
      return;
    }

    ensurePickerStyles();
    isPickerActive = true;
    document.body.style.cursor = 'crosshair';

    // Create highlight overlay
    overlayBox = document.createElement('div');
    overlayBox.id = 'sacp-picker-overlay';
    document.documentElement.appendChild(overlayBox);

    infoBadge = document.createElement('div');
    infoBadge.id = 'sacp-picker-badge';
    infoBadge.innerHTML = `<span class="tag">Seletor Ativo</span> <span class="hint">(Clique para copiar | ESC para sair)</span>`;
    document.documentElement.appendChild(infoBadge);

    // Event listeners for picker
    window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
    window.addEventListener('click', onClick, { capture: true });
    window.addEventListener('keydown', onKeyDown, { capture: true });
  }

  /**
   * Stop the visual picker
   */
  function stopPicker() {
    isPickerActive = false;
    document.body.style.cursor = '';

    if (overlayBox && overlayBox.parentNode) overlayBox.parentNode.removeChild(overlayBox);
    if (infoBadge && infoBadge.parentNode) infoBadge.parentNode.removeChild(infoBadge);

    overlayBox = null;
    infoBadge = null;
    hoveredElement = null;

    window.removeEventListener('mousemove', onMouseMove, { capture: true });
    window.removeEventListener('click', onClick, { capture: true });
    window.removeEventListener('keydown', onKeyDown, { capture: true });
  }

  /**
   * Mouse move tracker
   */
  function onMouseMove(e) {
    if (!isPickerActive) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlayBox || el === infoBadge || el.id?.startsWith('sacp-')) return;

    hoveredElement = el;
    const rect = el.getBoundingClientRect();

    if (overlayBox) {
      overlayBox.style.top = `${rect.top}px`;
      overlayBox.style.left = `${rect.left}px`;
      overlayBox.style.width = `${rect.width}px`;
      overlayBox.style.height = `${rect.height}px`;
    }

    if (infoBadge) {
      const badgeY = Math.max(10, rect.top - 32);
      const badgeX = Math.max(10, Math.min(window.innerWidth - 300, rect.left));
      infoBadge.style.top = `${badgeY}px`;
      infoBadge.style.left = `${badgeX}px`;

      const tagName = el.tagName.toLowerCase();
      const idStr = el.id ? `#${el.id}` : '';
      const textPreview = (el.innerText || el.textContent || '').trim().slice(0, 30);
      infoBadge.innerHTML = `<span class="tag">&lt;${tagName}${idStr}&gt;</span> <span class="hint">${textPreview ? `"${textPreview}..."` : '(Clique para copiar)'}</span>`;
    }
  }

  /**
   * Click handler to capture text
   */
  function onClick(e) {
    if (!isPickerActive) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = hoveredElement || document.elementFromPoint(e.clientX, e.clientY);
    stopPicker();

    if (!target) return;

    // Extract text cleanly
    let textToCopy = '';
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      textToCopy = target.value;
    } else if (target.isContentEditable) {
      textToCopy = target.innerText || target.textContent;
    } else {
      textToCopy = target.innerText || target.textContent || target.innerHTML;
    }

    textToCopy = (textToCopy || '').trim();

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showPickerToast(`Copiado (${textToCopy.length} caracteres)!`, 'success');
      }).catch(() => {
        // Fallback copy using textarea
        const temp = document.createElement('textarea');
        temp.value = textToCopy;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showPickerToast(`Copiado com sucesso!`, 'success');
      });
    } else {
      showPickerToast('Elemento não contém texto extraível.', 'warning');
    }
  }

  /**
   * Keyboard cancel handler (ESC)
   */
  function onKeyDown(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      stopPicker();
      showPickerToast('Seletor cancelado.', 'info');
    }
  }

  /**
   * Local toast helper for picker
   */
  function showPickerToast(msg, type = 'info') {
    ensurePickerStyles();
    let toast = document.getElementById('super-allow-copy-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'super-allow-copy-toast';
      document.documentElement.appendChild(toast);
    }

    const icons = { success: '✓', info: '⚡', warning: '🛡️', error: '✕' };
    toast.innerHTML = `
      <div class="sacp-toast-content sacp-${type}">
        <span class="sacp-icon">${icons[type] || '⚡'}</span>
        <span class="sacp-text">${msg}</span>
      </div>
    `;
    toast.className = 'sacp-toast-visible';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.className = 'sacp-toast-hidden';
    }, 2500);
  }

  // Export to global scope for isolated content script to trigger
  window.__SACP_START_PICKER__ = startPicker;

})();
