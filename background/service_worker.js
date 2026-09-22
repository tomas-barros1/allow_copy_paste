/**
 * Super Allow Copy & Paste Pro - Service Worker (Background Script)
 * Manages context menus, extension icon badges, keyboard commands, and global state.
 */

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
  domainOverrides: {}
};

/**
 * On Installation: setup storage and context menus
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...items });
  });

  setupContextMenus();
});

/**
 * Setup Context Menus
 */
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'sacp_root',
      title: 'Super Allow Copy & Paste Pro',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'sacp_toggle_site',
      parentId: 'sacp_root',
      title: '🔓 Alternar Desbloqueio neste Site',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'sacp_toggle_force',
      parentId: 'sacp_root',
      title: '⚡ Alternar Modo Força Bruta (Ultra)',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'sacp_picker',
      parentId: 'sacp_root',
      title: '🎯 Seletor Visual de Elemento (Copiar)',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'sacp_force_copy',
      parentId: 'sacp_root',
      title: '📋 Forçar Cópia da Seleção',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'sacp_options',
      parentId: 'sacp_root',
      title: '⚙️ Configurações Avançadas...',
      contexts: ['all']
    });
  });
}

/**
 * Handle Context Menu Clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id || tab.id < 0) return;

  switch (info.menuItemId) {
    case 'sacp_toggle_site':
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_SITE_ENABLED' }, () => {
        if (chrome.runtime.lastError) {}
        updateTabBadge(tab);
      });
      break;

    case 'sacp_toggle_force':
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_FORCE_MODE' }, () => {
        if (chrome.runtime.lastError) {}
        updateTabBadge(tab);
      });
      break;

    case 'sacp_picker':
      chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_ELEMENT_PICKER' }, () => {
        if (chrome.runtime.lastError) {}
      });
      break;

    case 'sacp_force_copy':
      chrome.tabs.sendMessage(tab.id, { action: 'FORCE_COPY_SELECTION' }, () => {
        if (chrome.runtime.lastError) {}
      });
      break;

    case 'sacp_options':
      chrome.runtime.openOptionsPage();
      break;
  }
});

/**
 * Handle Keyboard Shortcut Commands
 */
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0 || !tabs[0].id) return;
    const tab = tabs[0];

    switch (command) {
      case 'toggle_unblock':
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_SITE_ENABLED' }, () => {
          if (chrome.runtime.lastError) {}
          updateTabBadge(tab);
        });
        break;

      case 'toggle_force_mode':
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_FORCE_MODE' }, () => {
          if (chrome.runtime.lastError) {}
          updateTabBadge(tab);
        });
        break;

      case 'trigger_element_picker':
        chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_ELEMENT_PICKER' }, () => {
          if (chrome.runtime.lastError) {}
        });
        break;
    }
  });
});

/**
 * Update Action Badge based on tab state
 */
function updateTabBadge(tab) {
  if (!tab || !tab.url || !tab.url.startsWith('http')) {
    chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    return;
  }

  try {
    const url = new URL(tab.url);
    const domain = url.hostname;

    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      const override = settings.domainOverrides?.[domain];
      const isEnabled = override?.enabled ?? settings.globalEnabled;
      const isForce = override?.forceMode ?? settings.forceMode;

      if (!isEnabled) {
        chrome.action.setBadgeText({ tabId: tab.id, text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#64748b' });
      } else if (isForce) {
        chrome.action.setBadgeText({ tabId: tab.id, text: '⚡' });
        chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#eab308' });
      } else {
        chrome.action.setBadgeText({ tabId: tab.id, text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#22c55e' });
      }
    });
  } catch (e) {
    chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  }
}

/**
 * Listen for tab switches and navigation updates
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && !chrome.runtime.lastError) {
      updateTabBadge(tab);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab) {
    updateTabBadge(tab);
  }
});
