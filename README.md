# 🛡️ Super Allow Copy & Paste Pro (Manifest V3)

> **A extensão definitiva e mais poderosa para desbloquear Copiar, Colar, Botão Direito, Seleção de Texto, Atalhos de Teclado e Arrastar em qualquer navegador baseado no Chromium (Google Chrome, Brave, Microsoft Edge, Opera, Vivaldi, etc.).**

---

## 🚀 Por que esta é a extensão mais poderosa?

Muitos sites tentam impedir os usuários de copiar textos, colar senhas em formulários ou clicar com o botão direito através de múltiplos níveis de bloqueio. O **Super Allow Copy & Paste Pro** opera simultaneamente no **Contexto Principal da Página (MAIN World)** e no **Contexto Isolado da Extensão (ISOLATED World)** no padrão moderno **Manifest V3**, quebrando todas as barreiras conhecidas:

1. **🔒 Desligado por Padrão & Memória Inteligente por Site**:
   - Por padrão, a extensão **vem desligada** em todos os sites para garantir máxima privacidade e não interferir em nada na sua navegação comum.
   - Quando você estiver em um site com bloqueio e ativar a extensão (pelo popup ou pelo atalho `Alt + Shift + U`), **a extensão lembra daquele site** para sempre.
   - Nas próximas visitas àquele domínio, o desbloqueio já estará automaticamente ativo.
2. **⚡ Interceptação de Protótipos Nativos (`EventTarget`, `Event`, `ClipboardData`)**:
   - Sobrescreve `Event.prototype.preventDefault` e `stopPropagation` para que scripts maliciosos não consigam cancelar ações legítimas do usuário.
   - Neutraliza interceptações de `copy`, `cut`, `paste`, `contextmenu`, `selectstart` e `dragstart`.
3. **🧹 Cópia Limpa (Anti-Marca D'água)**:
   - Intercepta `DataTransfer.prototype.setData` para remover automaticamente sufixos chatos de *"Leia mais em https://..."* ou textos promocionais injetados na sua área de transferência.
4. **🛡️ Dois Modos de Ação**:
   - **Modo Inteligente (Padrão)**: Desbloqueia o uso sem quebrar aplicativos e editores complexos (Google Docs, Figma, Monaco Editor, Notion).
   - **Modo Força Bruta (Ultra)**: Destrói todas as camadas invisíveis (*click shields* e *overlays transparentes*), limpa atributos inline e força a desativação de qualquer script anti-cópia.
5. **🎯 Seletor Visual de Elemento (*Element Picker*)**:
   - Uma ferramenta interativa com mira que permite passar o mouse sobre **qualquer** elemento na tela e copiá-lo imediatamente com 1 clique, mesmo se estiver em Canvas ou Shadow DOM.
6. **🔓 Desbloqueio de Campos de Entrada e Inputs Protegidos**:
   - Permite colar em campos bancários, formulários de exames e campos de confirmação com `readonly` ou manipuladores anti-paste.
7. **🕶️ Bypass de Detecção de Aba Oculta / Foco (Anti-Cheat / Anti-Blur)**:
   - Impede que sites detectem quando você troca de aba ou tira o foco da janela.
8. **⌨️ Atalhos Rápidos & Menus de Contexto**:
   - Controle total pelo teclado ou pelo menu do botão direito.
9. **🌐 Gerenciador de Regras por Domínio & Backup JSON**:
   - Configure regras específicas para cada site e exporte/importe suas configurações com facilidade.

---

## 📦 Como Instalar no Navegador (Chrome, Edge, Brave, etc.)

1. Abra seu navegador baseado no Chromium (Chrome, Brave, Edge, Opera, etc.).
2. Acesse a página de extensões:
   - **Google Chrome**: `chrome://extensions/`
   - **Brave**: `brave://extensions/`
   - **Microsoft Edge**: `edge://extensions/`
   - **Opera**: `opera://extensions/`
3. No canto superior direito, **ative a chave "Modo do desenvolvedor"** (*Developer mode*).
4. Clique no botão **"Carregar sem compactação"** (*Load unpacked*).
5. Selecione a pasta onde os arquivos estão localizados:
   ```
   /home/tom/Projetos/allow_copy_paste
   ```
6. Pronto! O ícone do **Super Allow Copy & Paste Pro** aparecerá na sua barra de extensões.

---

## ⌨️ Atalhos de Teclado Padrão

| Atalho | Ação |
|---|---|
| `Alt + Shift + U` | Alternar Desbloqueio no site atual |
| `Alt + Shift + F` | Alternar Modo Força Bruta (Ultra) |
| `Alt + Shift + P` | Ativar o Seletor Visual de Elemento para Copiar Texto |
| `ESC` | Cancelar o Seletor Visual de Elemento |

*(Você pode personalizar esses atalhos a qualquer momento em `chrome://extensions/shortcuts`)*

---

## 🧪 Como Testar a Extensão

Incluímos uma página completa de testes com os bloqueios mais agressivos da web:

1. Abra o arquivo [`test_page.html`](file:///home/tom/Projetos/allow_copy_paste/test_page.html) no seu navegador.
2. Teste copiar, colar no input bloqueado, selecionar o texto protegido e usar o botão direito.
3. Teste o **Seletor Visual (`Alt + Shift + P`)** e o **Modo Força Bruta (`Alt + Shift + F`)**.

---

## 📁 Estrutura do Projeto

```
allow_copy_paste/
├── manifest.json              # Configuração Manifest V3
├── test_page.html             # Laboratório de testes de bloqueio
├── README.md                  # Documentação completa
├── _locales/                  # Suporte multi-idioma (pt_BR, en, es)
│   ├── pt_BR/messages.json
│   ├── en/messages.json
│   └── es/messages.json
├── icons/                     # Ícones em alta resolução (16, 32, 48, 128)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── background/
│   └── service_worker.js      # Gerenciador de contexto, atalhos e badges
├── content/
│   ├── inject_main.js         # Script no MAIN world (protótipos e eventos nativos)
│   ├── content_isolated.js    # Script no ISOLATED world (CSS, DOM cleaner, observer)
│   └── element_picker.js      # Ferramenta visual de extração de texto e toasts
├── popup/
│   ├── popup.html             # Interface popup moderna
│   ├── popup.css              # Estilos dark glassmorphism
│   └── popup.js               # Controlador do popup
└── options/
    ├── options.html           # Painel de configurações avançadas
    ├── options.css            # Estilos do painel
    └── options.js             # Lógica de regras por domínio e backup
```
