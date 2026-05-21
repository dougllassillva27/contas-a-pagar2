# 📋 Plano Atômico: Widget Lancamentos (Electron)
**Projeto:** contas-a-pagar | **Módulo:** `src/modules/widgetLancamentos/` | **Data:** 2026-05-21

## 🎯 Objetivo
Widget desktop Windows para lançamento rápido via `Ctrl+Alt+N`, integrado à API existente.

**Critério de Sucesso:**
1. `Ctrl+Alt+N` abre modal em <200ms com foco em descrição
2. Formulário valida e envia para API com token correto
3. Feedback visual via modal alert
4. Tray icon funcional com opções de configuração
5. `npm run build` gera installer `.exe`

**Fora do Escopo:** Edição/exclusão, sync bidirecional, anexos, multi-usuário dinâmico

## ⚙️ Especificações
| Categoria | Decisão |
|-----------|---------|
| Plataforma | Windows 10/11 |
| Stack | Electron 30+ + Node.js 18 |
| UI | BrowserWindow modal + reuso de styles |
| Hotkey | `Ctrl+Alt+N` via `globalShortcut` |
| API | `POST /api/v1/integracao/lancamentos` + `x-api-key` |
| Build | `electron-builder` → NSIS |

## ✅ Checklist
### Tarefa 1: Scaffold
- [x] package.json, main.js, preload.js, electron-builder.yml
- Validação: `npm start` → tray + hotkey funcionam

### Tarefa 2: UI Modal
- [x] renderer/index.html, styles.css, form.js
- Validação: modal renderiza, valida campos, submit via IPC

### Tarefa 3: API Integration
- [x] api/client.js, config/loader.js, config/default.json
- Validação: POST → 201 = sucesso, 4xx/5xx = alert

### Tarefa 4: Build
- [x] electron-builder.yml configurado
- Validação: `npm run build` → dist/Widget Lancamentos Setup.exe

### Tarefa 5: Docs + Tests
- [x] README.md, PLAN.md, __tests__/api.test.js

## 🔐 Segurança
- Token em config.json com permissões restritas
- contextIsolation + sandbox no renderer
- CSP no HTML para prevenir XSS
- NÃO commitar config/default.json com tokens

## ⚠️ Riscos
| Risco | Mitigação |
|-------|----------|
| Conflito hotkey | Permitir reconfiguração via config.json |
| Token em arquivo plano | Permissões + aviso no README |
| Bundle ~100MB | Aceito para MVP |

## 🚀 Comandos
```bash
cd src/modules/widgetLancamentos
npm install
npm start          # Dev mode
npm run build      # Production build
```

*Atualizar este arquivo se houver mudanças no escopo.*