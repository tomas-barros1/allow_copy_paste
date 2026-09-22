/**
 * Super Allow Copy & Paste Pro - Options Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_SETTINGS = {
    globalEnabled: false,
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

  let currentSettings = { ...DEFAULT_SETTINGS };

  // Tab switching
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      navItems.forEach((n) => n.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Inputs
  const optGlobalEnabled = document.getElementById('optGlobalEnabled');
  const optAllowCopy = document.getElementById('optAllowCopy');
  const optAllowPaste = document.getElementById('optAllowPaste');
  const optStripWatermark = document.getElementById('optStripWatermark');
  const optAllowContextMenu = document.getElementById('optAllowContextMenu');
  const optAllowSelection = document.getElementById('optAllowSelection');
  const optAllowDrag = document.getElementById('optAllowDrag');
  const optAllowShortcuts = document.getElementById('optAllowShortcuts');
  const optBypassVisibility = document.getElementById('optBypassVisibility');
  const optShowToasts = document.getElementById('optShowToasts');

  // Domain manager
  const inputNewDomain = document.getElementById('inputNewDomain');
  const selectDomainMode = document.getElementById('selectDomainMode');
  const btnAddDomain = document.getElementById('btnAddDomain');
  const domainListBody = document.getElementById('domainListBody');

  // Backup
  const btnExportConfig = document.getElementById('btnExportConfig');
  const fileImportConfig = document.getElementById('fileImportConfig');
  const btnResetConfig = document.getElementById('btnResetConfig');

  // Toast
  const saveToast = document.getElementById('saveToast');
  function showSaved(msg = 'Configurações salvas com sucesso!') {
    saveToast.textContent = msg;
    saveToast.classList.add('visible');
    setTimeout(() => {
      saveToast.classList.remove('visible');
    }, 2000);
  }

  // Load from chrome.storage
  function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      currentSettings = { ...DEFAULT_SETTINGS, ...items };

      optGlobalEnabled.checked = currentSettings.globalEnabled ?? false;
      optAllowCopy.checked = currentSettings.allowCopy;
      optAllowPaste.checked = currentSettings.allowPaste;
      optStripWatermark.checked = currentSettings.stripWatermark;
      optAllowContextMenu.checked = currentSettings.allowContextMenu;
      optAllowSelection.checked = currentSettings.allowSelection;
      optAllowDrag.checked = currentSettings.allowDrag;
      optAllowShortcuts.checked = currentSettings.allowShortcuts;
      optBypassVisibility.checked = currentSettings.bypassVisibility;
      optShowToasts.checked = currentSettings.showToasts;

      renderDomainTable();
    });
  }

  // Save changes to storage
  function saveCurrentSettings() {
    chrome.storage.sync.set(currentSettings, () => {
      showSaved();
    });
  }

  // Bind checkboxes
  const checkboxes = [
    { el: optGlobalEnabled, key: 'globalEnabled' },
    { el: optAllowCopy, key: 'allowCopy' },
    { el: optAllowPaste, key: 'allowPaste' },
    { el: optStripWatermark, key: 'stripWatermark' },
    { el: optAllowContextMenu, key: 'allowContextMenu' },
    { el: optAllowSelection, key: 'allowSelection' },
    { el: optAllowDrag, key: 'allowDrag' },
    { el: optAllowShortcuts, key: 'allowShortcuts' },
    { el: optBypassVisibility, key: 'bypassVisibility' },
    { el: optShowToasts, key: 'showToasts' }
  ];

  checkboxes.forEach(({ el, key }) => {
    el.addEventListener('change', () => {
      currentSettings[key] = el.checked;
      saveCurrentSettings();
    });
  });

  // Render Domain Table
  function renderDomainTable() {
    domainListBody.innerHTML = '';
    const overrides = currentSettings.domainOverrides || {};
    const domains = Object.keys(overrides);

    if (domains.length === 0) {
      domainListBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Nenhuma regra personalizada configurada ainda. As configurações globais estão ativas em todos os sites.
          </td>
        </tr>
      `;
      return;
    }

    domains.forEach((domain) => {
      const cfg = overrides[domain];
      const tr = document.createElement('tr');

      let statusBadge = '';
      let modeBadge = '';

      if (cfg.enabled === false) {
        statusBadge = '<span class="badge-tag badge-disabled">Desativado</span>';
        modeBadge = '<span class="badge-tag badge-disabled">-</span>';
      } else {
        statusBadge = '<span class="badge-tag badge-enabled">Ativo</span>';
        if (cfg.forceMode) {
          modeBadge = '<span class="badge-tag badge-force">Força Bruta (Ultra)</span>';
        } else {
          modeBadge = '<span class="badge-tag badge-enabled">Inteligente</span>';
        }
      }

      tr.innerHTML = `
        <td><strong>${domain}</strong></td>
        <td>${statusBadge}</td>
        <td>${modeBadge}</td>
        <td>
          <button class="btn-del" data-domain="${domain}">Remover</button>
        </td>
      `;

      domainListBody.appendChild(tr);
    });

    // Bind remove buttons
    document.querySelectorAll('.btn-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const dom = e.target.dataset.domain;
        if (dom && currentSettings.domainOverrides[dom]) {
          delete currentSettings.domainOverrides[dom];
          saveCurrentSettings();
          renderDomainTable();
        }
      });
    });
  }

  // Add Domain Rule
  btnAddDomain.addEventListener('click', () => {
    let raw = (inputNewDomain.value || '').trim().toLowerCase();
    if (!raw) return;

    try {
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        raw = new URL(raw).hostname;
      }
    } catch (e) {}

    const mode = selectDomainMode.value;
    let enabled = true;
    let forceMode = false;

    if (mode === 'disabled') {
      enabled = false;
    } else if (mode === 'force') {
      enabled = true;
      forceMode = true;
    } else {
      enabled = true;
      forceMode = false;
    }

    currentSettings.domainOverrides[raw] = { enabled, forceMode };
    inputNewDomain.value = '';
    saveCurrentSettings();
    renderDomainTable();
  });

  // Export JSON Backup
  btnExportConfig.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentSettings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `super_allow_copy_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Import JSON Backup
  fileImportConfig.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && typeof imported === 'object') {
          currentSettings = { ...DEFAULT_SETTINGS, ...imported };
          saveCurrentSettings();
          loadSettings();
          showSaved('Backup importado com sucesso!');
        }
      } catch (err) {
        alert('Erro ao importar arquivo JSON: formato inválido.');
      }
    };
    reader.readAsText(file);
  });

  // Reset Configuration
  btnResetConfig.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja restaurar todas as configurações para o padrão de fábrica?')) {
      currentSettings = { ...DEFAULT_SETTINGS, globalEnabled: false, domainOverrides: {} };
      saveCurrentSettings();
      loadSettings();
      showSaved('Configurações restauradas para o padrão (Desligado por padrão).');
    }
  });

  loadSettings();
});
