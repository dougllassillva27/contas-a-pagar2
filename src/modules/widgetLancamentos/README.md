# ⚡ Widget Lançamentos

![Status](https://img.shields.io/badge/status-active-success)
![Plataforma](https://img.shields.io/badge/plataforma-Windows-0078D4)
![Electron](https://img.shields.io/badge/electron-30.5.1-47848F)
![License](https://img.shields.io/badge/license-MIT-blue)

**Widget desktop modular, seguro e integrado ao sistema de gestão financeira.**

Widget Lançamentos é uma aplicação desktop construída com **Electron 30**, projetada para permitir o lançamento rápido de contas a pagar via atalho global, sem abrir o sistema completo no navegador.

O projeto combina uma interface dark premium com integração nativa ao backend via HTTP, persistência segura de configurações no diretório de dados do usuário e um motor resiliente de captura de erros fatais em produção.

---

## 🧠 Visão geral técnica

Widget Lançamentos é uma **aplicação desktop Electron** sem dependência de navegador externo.

A arquitetura separa responsabilidades em três camadas:

- **Interface (Renderer):** HTML + CSS + JS vanilla. Totalmente isolada via `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`. Nenhuma API do Node.js é acessível diretamente no renderer.
- **Processo principal (Main):** Node.js puro. Gerencia janelas, atalhos globais, Tray icon, IPC, autostart no Windows e interceptação global de erros fatais.
- **Ponte segura (Preload):** `contextBridge` com namespace `widgetAPI`. Expõe apenas os métodos estritamente necessários ao renderer — sem vazar `ipcRenderer` completo.

O backend é o sistema principal externo (`contas-a-pagar`), acessado via HTTP com autenticação por token API (`x-api-key`).

Não há banco de dados local. As configurações dinâmicas do usuário são persistidas em JSON no diretório `userData` do sistema operacional.

---

## ⚙️ Highlights técnicos

- Arquitetura Electron segura: `contextIsolation`, `sandbox`, `nodeIntegration: false`
- Persistência de configurações no `userData` — sem erros de permissão no Windows
- Motor global de logging de erros fatais (`Log_erros.txt`) com fallback inteligente por ambiente
- Captura de `uncaughtException` e `unhandledRejection` com notificação nativa via `dialog.showErrorBox`
- Tela de Configurações Premium com capturador dinâmico de atalhos e toggle de autostart
- Auto-Sizing Absoluto via IPC: altura da janela calculada pelo DOM real, sem valores hardcoded
- Técnica de opacidade zero na abertura para erradicar flickering visual no DWM do Windows
- Tray icon persistente com menu de contexto: Abrir, Configurações, Sair
- Atalho global configurável (padrão `Ctrl+Alt+N`) com Single Instance Lock
- Suite de testes automatizados com Jest (9 testes, 100% passando)

---

## 🏗️ Arquitetura

```txt
Usuário (atalho global / Tray icon)
   │
   ▼
Main Process (main.js)
   │
   ├── globalShortcut → exibirJanela()
   ├── Tray icon → menu de contexto
   ├── IPC handlers (submit, resize, config, hide)
   ├── config/loader.js → leitura/escrita userData
   ├── config/logger.js → Log_erros.txt
   └── process.on('uncaughtException' | 'unhandledRejection')
   │
   ├──▶ mainWindow (BrowserWindow)
   │       preload.js → contextBridge → widgetAPI
   │       renderer/index.html + styles.css + form.js
   │
   └──▶ configWindow (BrowserWindow)
           preload.js → contextBridge → widgetAPI
           renderer/config.html + config.js
   │
   ▼
API HTTP Backend (sistema principal)
   POST /api/v1/integracao/lancamentos
   GET  /health
   Header: x-api-key
```

---

## 📁 Estrutura do projeto

```txt
widgetLancamentos/
├── main.js                  # Processo principal Electron
├── preload.js               # Ponte segura contextBridge
├── electron-builder.yml     # Configuração de empacotamento NSIS
├── package.json
├── renderer/
│   ├── index.html           # Interface principal do widget
│   ├── config.html          # Tela de configurações premium
│   ├── form.js              # Lógica do formulário de lançamentos
│   ├── config.js            # Lógica da tela de configurações
│   ├── styles.css           # Design system dark premium
│   └── icon.ico             # Ícone do Tray e instalador
├── config/
│   ├── default.json         # Configurações padrão empacotadas
│   ├── loader.js            # Leitura/escrita segura no userData
│   └── logger.js            # Motor de logging de erros fatais
├── api/
│   └── client.js            # Cliente HTTP (axios) para o backend
└── __tests__/
    └── api.test.js          # Testes Jest do cliente de API
```

---

## 📦 Responsabilidades por pasta

### `main.js`

Processo principal do Electron. Gerencia o ciclo de vida da aplicação: criação de janelas, Single Instance Lock, registro do atalho global, Tray icon, IPC handlers, controle de autostart no Windows e captura global de exceções fatais.

### `preload.js`

Ponte de segurança entre o processo main e o renderer. Expõe via `contextBridge.exposeInMainWorld` apenas os métodos autorizados sob o namespace `window.widgetAPI`. O `ipcRenderer` nunca é exposto diretamente.

### `renderer/`

Camada de interface do usuário. Puro HTML, CSS e JavaScript vanilla. Sem acesso direto ao Node.js. Toda comunicação com o processo main ocorre exclusivamente via `window.widgetAPI`.

### `config/`

Gerenciamento de configurações persistentes e logging de erros:
- `loader.js`: detecta dinamicamente o caminho `userData`, faz bootstrapping do JSON de configuração na primeira execução e expõe `loadConfig()` e `saveConfig()` com fallback seguro para ambientes de teste.
- `logger.js`: grava erros estruturados em `Log_erros.txt`. Em produção (app empacotado), prioriza a escrita no `userData`. Em desenvolvimento, tenta o diretório do executável.

### `api/`

Cliente HTTP do widget. Usa `axios` com instância pré-configurada. Valida payload antes da requisição, normaliza erros de rede (ECONNREFUSED, 401, 400, 5xx) em respostas padronizadas `{ success, error }`.

### `__tests__/`

Suite de testes Jest do cliente de API. Cobre envio de lançamento (payload incompleto, token inválido, erros de rede, erros HTTP) e healthcheck de conexão. Mock completo do axios e do loader de configuração.

---

## 🔄 Fluxo principal da aplicação

```txt
1. Usuário pressiona o atalho global (ex: Ctrl+Alt+N)
2. main.js detecta o atalho via globalShortcut
3. exibirJanela() abre a mainWindow com opacidade 0 (anti-flicker)
4. O renderer envia o evento IPC 'resize-window' com a altura real do DOM
5. main.js ajusta a altura da BrowserWindow e restaura a opacidade para 1
6. O formulário recebe foco automático no campo Descrição
7. Usuário preenche e envia o formulário
8. form.js valida os campos e chama window.widgetAPI.submitLancamento(data)
9. preload.js faz invoke('submit-lancamento', data) para o main
10. main.js chama enviarLancamento(data) via api/client.js
11. O backend retorna sucesso ou erro — o renderer exibe o overlay de resultado
12. Ao pressionar o atalho novamente ou clicar fora, a janela é ocultada
```

---

## 💾 Persistência

As configurações dinâmicas do usuário são armazenadas em JSON no diretório de dados do usuário do sistema operacional:

- **Windows:** `C:\Users\<usuário>\AppData\Roaming\widget-lancamentos\default.json`

Na primeira execução, o arquivo é criado automaticamente a partir do `config/default.json` empacotado no binário. Todas as escritas subsequentes ocorrem exclusivamente no `userData`, evitando erros de permissão em diretórios protegidos do sistema (ex: `Program Files`).

```json
{
  "apiUrl": "https://contas.dougllassillva.com.br",
  "apiToken": "seu_token_real_aqui",
  "hotkey": "Ctrl+Alt+N",
  "defaultUserId": 1,
  "autoStart": false
}
```

---

## 🔐 Segurança e privacidade

| Critério | Status |
|---|---|
| `contextIsolation: true` | Ativo em todas as janelas |
| `nodeIntegration: false` | Desabilitado em todas as janelas |
| `sandbox: true` | Ativo em todas as janelas |
| `contextBridge` restrito | Apenas métodos explicitamente autorizados |
| Autenticação por token | Header `x-api-key` em todas as requisições |
| Configurações sensíveis | Nunca comitadas — armazenadas localmente no `userData` |

> ⚠️ **Nunca commitar `config/default.json` com `apiToken` real.** O arquivo no repositório contém apenas valores-padrão sem credenciais.

---

## 🔎 Sistemas principais

### 🖥️ Janela de Lançamento (mainWindow)

Interface principal do widget. Frameless, transparente, sem taskbar. Ativada pelo atalho global ou clique no Tray. Suporta:
- Seleção de usuário (Dodo / Vitória)
- Campos: Descrição, Valor, Tipo de Conta (Fixa / Única / Parcelada), Parcelas, Terceiro
- Validação inline com mensagens de erro por campo
- Auto-clear de erros ao digitar
- Overlay de resultado (sucesso/erro) com auto-timeout

### ⚙️ Tela de Configurações (configWindow)

Janela secundária acessível via Tray → Configurações. Frameless, com Auto-Sizing Absoluto. Permite:
- Captura dinâmica de atalho global (combinações Ctrl/Alt/Shift + tecla)
- Toggle de inicialização automática com o Windows (autostart via `app.setLoginItemSettings`)
- Persistência imediata das configurações no `userData`

### 🪣 Tray Icon

Ícone persistente na bandeja do sistema Windows. Menu de contexto:
- **Abrir Widget** → exibe a mainWindow
- **Configurações** → exibe a configWindow
- **Sair** → encerra a aplicação

### 🛡️ Motor de Logs Fatais

Em caso de exceção não capturada ou rejeição de Promise não tratada:
1. O erro é interceptado pelos listeners globais em `main.js`
2. `logger.js` grava o erro formatado em `Log_erros.txt` (timestamp, tipo, mensagem, stack trace)
3. Uma caixa de diálogo nativa informa o caminho do arquivo de log ao usuário
4. A aplicação encerra de forma segura via `app.quit()`

**Localização do log em produção:** `%APPDATA%\widget-lancamentos\Log_erros.txt`

---

## 🌐 Backend / API

O widget consome o sistema principal externo via HTTP REST.

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/v1/integracao/lancamentos` | `POST` | Lança uma conta a pagar |
| `/health` | `GET` | Verifica disponibilidade do servidor |

Autenticação via header `x-api-key`. O token é lido do `userData` em tempo de execução.

---

## ⚙️ Variáveis de configuração

Não há variáveis de ambiente. O widget usa o arquivo de configuração `userData/default.json`:

| Chave | Tipo | Descrição |
|---|---|---|
| `apiUrl` | string | URL base do sistema principal |
| `apiToken` | string | Token de autenticação da API |
| `hotkey` | string | Atalho global (ex: `Ctrl+Alt+N`) |
| `defaultUserId` | number | ID de usuário padrão |
| `autoStart` | boolean | Iniciar com o Windows |

---

## 🚀 Como rodar localmente

```bash
cd src/modules/widgetLancamentos
npm install
npm start
```

> Antes de iniciar, certifique-se de que o sistema principal está rodando e que o `apiToken` no `userData/default.json` é válido.

---

## 🏗️ Build

Gera o instalador NSIS para Windows (x64 + ia32) a partir da raiz do repositório:

```bash
npm run build:widget
```

Ou diretamente na pasta do módulo:

```bash
cd src/modules/widgetLancamentos
npm run build
```

O instalador é gerado em:

```txt
src/modules/widgetLancamentos/dist/Widget Lancamentos Setup 0.1.0.exe
```

---

## 🌍 Deploy

O widget é distribuído como instalador NSIS autônomo. Não há deploy em servidor.

O executável é instalado por usuário (`perMachine: false`) via NSIS, com atalho no Desktop e no Menu Iniciar. Após instalação, o widget pode ser configurado para iniciar automaticamente com o Windows via a Tela de Configurações.

---

## 🧰 Tecnologias

| Tecnologia | Versão | Responsabilidade |
|---|---|---|
| Electron | 30.5.1 | Runtime desktop multi-processo |
| Node.js | 18+ | Processo principal e lógica de negócio |
| HTML / CSS / JS | Vanilla | Interface do renderer |
| axios | ^1.6.8 | Cliente HTTP para o backend |
| electron-builder | ^24.13.3 | Empacotamento NSIS para Windows |
| Jest | ^30.2.0 | Suite de testes automatizados |

---

## 🧪 Testes

Framework: **Jest**

```bash
# Executar apenas os testes do widget (a partir da raiz do repositório)
npm test -- src/modules/widgetLancamentos/__tests__/api.test.js
```

| Suite | Testes | Status |
|---|---|---|
| `API Client - enviarLancamento` | 7 | ✅ |
| `API Client - testarConexao` | 2 | ✅ |
| **Total** | **9** | **100%** |

Cobertura: validação de payload, rejeição por token inválido, normalização de valor, erros de rede (ECONNREFUSED), erros HTTP (401, 400), healthcheck.

---

## 📌 Decisões técnicas

- **Electron frameless + transparente:** evita bordas do sistema operacional e mantém o visual de widget premium sem barra de título nativa.
- **Auto-Sizing Absoluto via IPC:** a altura da janela é calculada pelo `offsetHeight` real do DOM no renderer e enviada ao main via `resize-window`. Elimina alturas fixas que causam cortes ou espaços em branco.
- **Opacidade zero na abertura:** a janela ganha foco invisível, processa o resize e o DOM, depois é revelada. Erradica o flickering visual causado pelo DWM do Windows.
- **`userData` para configurações:** em vez de gravar no diretório de instalação (sujeito a restrições de administrador no `Program Files`), as configurações são sempre salvas no `AppData` do usuário.
- **`isPackaged` no logger:** em produção, o log vai direto para `userData`. Em desenvolvimento, vai para o diretório do executável, facilitando o debug local sem poluir o perfil do usuário.
- **`contextBridge` restrito:** o `ipcRenderer` nunca é exposto diretamente ao renderer. Apenas os métodos explicitamente declarados no preload são acessíveis, prevenindo injeção de mensagens IPC arbitrárias.
- **Single Instance Lock:** garante que apenas uma instância do widget esteja rodando. Uma segunda tentativa de abertura foca a janela já existente.

---

## 📄 Licença

MIT — consulte o arquivo `LICENSE` na raiz do repositório.

---

<div align="center">

✨ Desenvolvido por Douglas Silva ✨

</div>