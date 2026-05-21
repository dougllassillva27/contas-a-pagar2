# ⚡ Widget Lancamentos

Widget desktop para lançamento rápido de contas via atalho global `Ctrl+Alt+N`.

## 🎯 Funcionalidades
- ✅ Atalho global configurável (`Ctrl+Alt+N` por padrão)
- ✅ Modal para entrada rápida de lançamentos
- ✅ Integração com API existente do sistema principal
- ✅ Tray icon com menu: Abrir, Configurar, Auto-start toggle
- ✅ Auto-start opcional no Windows (Registry)
- ✅ Validação client-side + feedback visual
- ✅ Suporte a seleção de usuário (Dodo/Vitória)

## 📦 Instalação
### Pré-requisitos
- Node.js 18+
- Sistema principal rodando em `https://contas.dougllassillva.com.br`
- Token de API válido (mesmo do `.env` do backend)

### Desenvolvimento
```bash
cd src/modules/widgetLancamentos
npm install
# Editar config/default.json com apiToken real
npm start
```

### Build para Produção
```bash
npm run build
# Gera dist/Widget Lancamentos Setup.exe
```

## ⚙️ Configuração
Edite `config/default.json`:
```json
{
  "apiUrl": "https://contas.dougllassillva.com.br",
  "apiToken": "seu_token_real_aqui",
  "hotkey": "Ctrl+Alt+N",
  "defaultUserId": 1,
  "autoStart": false
}
```

> ⚠️ **Segurança**: NÃO commitar `config/default.json` com tokens reais.

## 🔧 Troubleshooting
- "Servidor indisponível": Verifique apiUrl e se o sistema está online
- "Token inválido": Copie API_TOKEN do .env do backend para config/default.json
- Atalho não registra: Tente outra combinação em hotkey

## 🗂️ Estrutura
```
widgetLancamentos/
├── package.json
├── main.js
├── preload.js
├── electron-builder.yml
├── renderer/ (index.html, styles.css, form.js, icon.ico)
├── config/ (default.json, loader.js)
├── api/client.js
├── __tests__/api.test.js
├── README.md
└── PLAN.md
```

*Versão: 0.1.0 | 2026-05-21*