/**
 * Super Allow Copy & Paste Pro - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainEl = document.getElementById('currentDomain');
  const siteToggle = document.getElementById('siteToggle');
  const btnSmartMode = document.getElementById('btnSmartMode');
  const btnForceMode = document.getElementById('btnForceMode');
  const btnElementPicker = document.getElementById('btnElementPicker');
  const btnForceCopy = document.getElementById('btnForceCopy');
  const btnOptions = document.getElementById('btnOptions');
  const statusToast = document.getElementById('statusToast');

  // Feature checkboxes
  const toggleCopyPaste = document.getElementById('toggleCopyPaste');
  const toggleContextMenu = document.getElementById('toggleContextMenu');
  const toggleSelection = document.getElementById('toggleSelection');
  const toggleWatermark = document.getElementById('toggleWatermark');
  const toggleShortcuts = document.getElementById('toggleShortcuts');
  const toggleVisibility = document.getElementById('toggleVisibility');

  let activeTab = null;
  let currentDomain = '';
  let fullSettings = {};

  // 1. Query current active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      activeTab = tabs[0];
      if (activeTab.url && activeTab.url.startsWith('http')) {
        const url = new URL(activeTab.url);
        currentDomain = url.hostname;
        currentDomainEl.textContent = currentDomain;
      } else {
        currentDomainEl.textContent = 'Página do Sistema';
        siteToggle.disabled = true;
      }
    }
  } catch (e) {
    currentDomainEl.textContent = 'Navegador';
  }

  // 2. Load settings from storage
  function loadAndRenderSettings() {
    chrome.storage.sync.get(null, (items) => {
      fullSettings = items || {};
      const domainOverrides = fullSettings.domainOverrides || {};
      const domainConfig = domainOverrides[currentDomain];

      const isEnabled = domainConfig?.enabled ?? fullSettings.globalEnabled ?? true;
      const isForce = domainConfig?.forceMode ?? fullSettings.forceMode ?? false;

      // Master switch
      siteToggle.checked = isEnabled;

      // Mode buttons
      if (isForce) {
        btnForceMode.classList.add('active');
        btnSmartMode.classList.remove('active');
      } else {
        btnSmartMode.classList.add('active');
        btnForceMode.classList.remove('active');
      }

      // Feature toggles
      toggleCopyPaste.checked = fullSettings.allowCopy ?? true;
      toggleContextMenu.checked = fullSettings.allowContextMenu ?? true;
      toggleSelection.checked = fullSettings.allowSelection ?? true;
      toggleWatermark.checked = fullSettings.stripWatermark ?? true;
      toggleShortcuts.checked = fullSettings.allowShortcuts ?? true;
      toggleVisibility.checked = fullSettings.bypassVisibility ?? false;
    });
  }

  loadAndRenderSettings();

  // 3. Status Toast Feedback Helper
  let toastTimer = null;
  function showStatus(text) {
    if (toastTimer) clearTimeout(toastTimer);
    statusToast.textContent = text;
    toastTimer = setTimeout(() => {
      statusToast.textContent = '';
    }, 2000);
  }

  // 4. Handle Master Switch Toggle
  siteToggle.addEventListener('change', () => {
    const isEnabled = siteToggle.checked;
    const domainOverrides = { ...(fullSettings.domainOverrides || {}) };

    domainOverrides[currentDomain] = {
      ...(domainOverrides[currentDomain] || {}),
      enabled: isEnabled
    };

    chrome.storage.sync.set({ domainOverrides }, () => {
      fullSettings.domainOverrides = domainOverrides;
      notifyContentScript({ action: 'UPDATE_SETTINGS' });
      showStatus(isEnabled ? '✓ Desbloqueio ativado!' : '✕ Desbloqueio desativado');
    });
  });

  // 5. Handle Mode Selection
  btnSmartMode.addEventListener('click', () => {
    setMode(false);
  });

  btnForceMode.addEventListener('click', () => {
    setMode(true);
  });

  function setMode(force) {
    const domainOverrides = { ...(fullSettings.domainOverrides || {}) };
    domainOverrides[currentDomain] = {
      ...(domainOverrides[currentDomain] || {}),
      forceMode: force
    };

    chrome.storage.sync.set({ domainOverrides }, () => {
      fullSettings.domainOverrides = domainOverrides;
      if (force) {
        btnForceMode.classList.add('active');
        btnSmartMode.classList.remove('active');
        showStatus('🛡️ Modo Força Bruta ativado!');
      } else {
        btnSmartMode.classList.add('active');
        btnForceMode.classList.remove('active');
        showStatus('⚡ Modo Inteligente ativado!');
      }
      notifyContentScript({ action: 'UPDATE_SETTINGS' });
    });
  }

  // 6. Handle Feature Toggles
  const featureMap = [
    { el: toggleCopyPaste, key: 'allowCopy', extraKey: 'allowPaste' },
    { el: toggleContextMenu, key: 'allowContextMenu' },
    { el: toggleSelection, key: 'allowSelection' },
    { el: toggleWatermark, key: 'stripWatermark' },
    { el: toggleShortcuts, key: 'allowShortcuts' },
    { el: toggleVisibility, key: 'bypassVisibility' }
  ];

  featureMap.forEach(({ el, key, extraKey }) => {
    el.addEventListener('change', () => {
      const update = { [key]: el.checked };
      if (extraKey) update[extraKey] = el.checked;

      chrome.storage.sync.set(update, () => {
        Object.assign(fullSettings, update);
        notifyContentScript({ action: 'UPDATE_SETTINGS' });
        showStatus('Configurações atualizadas');
      });
    });
  });

  // 7. Quick Tools
  btnElementPicker.addEventListener('click', () => {
    if (!activeTab || !activeTab.id) return;
    chrome.tabs.sendMessage(activeTab.id, { action: 'TRIGGER_ELEMENT_PICKER' }, () => {
      window.close(); // Close popup so user can click on the page
    });
  });

  btnForceCopy.addEventListener('click', () => {
    if (!activeTab || !activeTab.id) return;
    chrome.tabs.sendMessage(activeTab.id, { action: 'FORCE_COPY_SELECTION' }, (res) => {
      if (res && res.success) {
        showStatus('📋 Copiado com sucesso!');
      } else {
        showStatus('⚠️ Selecione um texto primeiro');
      }
    });
  });

  // 8. Options Page
  btnOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Helper to notify active tab
  function notifyContentScript(msg) {
    if (activeTab && activeTab.id) {
      chrome.tabs.sendMessage(activeTab.id, msg, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  }
});
