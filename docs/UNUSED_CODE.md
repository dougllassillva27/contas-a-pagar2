# Codigo Morto / Nao Utilizado

> Gerado em: 2026-07-03
> Fonte: analise estatica do codebase (imports, requires, referencias em templates EJS, package.json)

---

## 1. Arquivos Nunca Importados / Orfaos

| Arquivo | Confianca | Justificativa |
|---------|-----------|---------------|
| `src/config/db_dump.js` | **Alta** | Zero referencias em todo o codebase. Nao importado por nenhum modulo. Conteudo identico a `src/config/db.js` (pool PostgreSQL). Provavel artefato de dump manual. |
| `src/helpers/ConfiguracaoRepository.js` | **Alta** | Duplicata obsoleta de `src/repositories/ConfiguracaoRepository.js`. Zero imports. O `FinanceiroRepository.js` importa a versao em `repositories/`. |
| `src/helpers/LajeadoRepository.js` | **Alta** | Arquivo vazio (1 linha). Zero imports. Zero exports. Nao referenciado em nenhum lugar. |
| `src/scripts/google-apps-script-example.js` | **Media** | Referenciado apenas em `README.md` e `docs/PROJECT_MAP.md` como exemplo. Nunca importado no codigo. E um snippet standalone de referencia, nao codigo ativo. |
| `public/js/login.js` | **Alta** | Nunca incluido em nenhum template EJS. `src/views/login.ejs` nao carrega esse script. Contem logica de token persistente (`logoutPersistente`, validacao de token) que parece ter sido movida para outro fluxo ou abandonada. |
| `public/css/terceiros-dashboard.css` | **Alta** | Nunca referenciado em nenhum template EJS. `src/views/terceiros-dashboard.ejs` usa `partials/head.ejs` que carrega apenas `style.css` e `index.css`. Estilos do dashboard de terceiros estao inline no EJS como `<style>`. |

---

## 2. Rotas Nao Montadas no Express

| Arquivo | Confianca | Justificativa |
|---------|-----------|---------------|
| `src/routes/authRoutes.js` | **Alta** | Define rotas `/api/auth/token`, `/api/auth/validate`, `/api/auth/me`. Nunca montado em `src/app.js` (zero `require` ou `app.use`). Apenas usado em `__tests__/routes/authRoutes.test.js`. As rotas de auth estao embutidas em `publicRoutes.js` ou `integrationRoutes.js`. |

---

## 3. Funcoes Nunca Chamadas

| Arquivo | Funcao | Confianca | Justificativa |
|---------|--------|-----------|---------------|
| `public/js/utils.js` | `debounce(func, delay)` | **Alta** | Definida na linha 14. Nunca invocada em nenhum arquivo JS do frontend. `dragdrop.js` menciona "sem debounce" em comentario, confirmando que a funcao existe mas nao e usada. |
| `public/js/login.js` | `logoutPersistente()` | **Alta** | Definida na linha 115. Nunca chamada em nenhum template EJS ou arquivo JS. O arquivo `login.js` inteiro nao e carregado. |
| `public/js/utils.js` | `getTipoExibicao(item)` | **Baixa** | Definida na linha 29. Usada em `lancamentos.js` (linhas 582, 611). Porem, como `utils.js` e carregado via `<script>` global e `lancamentos.js` e um modulo ES6, a funcao depende de escopo global. Funciona, mas e fragil. |

---

## 4. Dependencias NPM Nao Utilizadas

| Pacote | Tipo | Confianca | Justificativa |
|--------|------|-----------|---------------|
| `cross-env` | devDependency | **Alta** | Listado em `package.json` (linha 42). Zero uso em qualquer script do `package.json` ou arquivo de configuracao. O script `dev` usa `set TZ=...` (sintaxe Windows nativa), nao `cross-env`. |

---

## 5. Modulos com Uso Limitado / Suspeitos

| Arquivo | Confianca | Justificativa |
|---------|-----------|---------------|
| `src/modules/dataHora/dataHoraNetlify/functions/dataHora.js` | **Media** | Funcao Netlify standalone para deploy alternativo. Nao importada pelo app principal. Documentada em `docs/PROJECT_MAP.md` como "deploy alternativo". Nao e codigo morto per se, mas e um deploy path separado. |
| `src/modules/widgetLancamentos/` (diretorio inteiro) | **Media** | Modulo Electron standalone com seu proprio `package.json` e `node_modules`. Nao integrado ao app Express principal. Build separado via `npm run build:widget`. Pode ser projeto paralelo ou funcionalidade futura. |

---

## 6. CSS Potencialmente Orfao

| Arquivo | Confianca | Justificativa |
|---------|-----------|---------------|
| `public/css/terceiros-dashboard.css` | **Alta** | Nunca vinculado a nenhum template. Estilos equivalentes existem inline em `terceiros-dashboard.ejs`. |

---

## Resumo por Confianca

| Confianca | Quantidade | Itens |
|-----------|------------|-------|
| **Alta** | 9 | `db_dump.js`, `helpers/ConfiguracaoRepository.js`, `helpers/LajeadoRepository.js`, `login.js`, `terceiros-dashboard.css`, `authRoutes.js`, `debounce()`, `logoutPersistente()`, `cross-env` |
| **Media** | 3 | `google-apps-script-example.js`, `dataHoraNetlify/`, `widgetLancamentos/` |
| **Baixa** | 1 | `getTipoExibicao()` (usada mas com padrao fragil de escopo global) |

---

## Recomendacao de Acao

1. **Seguro deletar (Alta confianca):** `src/config/db_dump.js`, `src/helpers/ConfiguracaoRepository.js`, `src/helpers/LajeadoRepository.js`, `public/css/terceiros-dashboard.css`
2. **Investigar antes de deletar:** `public/js/login.js` (logica de token persistente pode ser intencional mas nao integrada), `src/routes/authRoutes.js` (testes existem mas rota nao montada)
3. **Remover de `package.json`:** `cross-env` (nao usado em nenhum script)
4. **Avaliar se mantem:** `widgetLancamentos/` (modulo Electron separado), `dataHoraNetlify/` (deploy alternativo documentado)
