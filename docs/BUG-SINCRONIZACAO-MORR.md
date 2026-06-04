# �� Bug: Sincronização Morr → Cartão Douglas não estava funcionando

**Data:** 05/06/2026  
**Severidade:** Alta  
**Impacto:** Sincronização entre usuários (Dodo ID 1 → Vitória ID 2) não era executada

---

## �� Diagnóstico

Foram identificados **3 problemas relacionados**:

### 1. **Ausência de regras de sincronização no banco**

O sistema foi modernizado para usar sincronização dinâmica via `configuracoes.regras_sync` (JSONB), mas não havia garantia de que as regras estavam configuradas no banco para o usuário Dodo (ID 1).

**Evidência:**
- Teste unitário espera regras: `__tests__/services/syncService.test.js:32-35`
- Rota `/api/sincronizar` verifica existência de regras: `src/routes/apiRoutes.js:1524-1526`
- Sem regras configuradas = sincronização não executa

### 2. **Bot Telegram usando método legado**

O bot chamava `sincronizarFaturaMorr()` que fazia sincronização **apenas no próprio usuário**, não copiava para o usuário destino:

```javascript
// CÓDIGO ANTIGO (BUGADO)
async sincronizarFaturaMorr(usuarioId, ...) {
  const totalMorr = await repo.getTotalTerceiroCartao('Morr', usuarioId, ...);
  // ^^^ Busca no usuário 1 (Dodo)
  await repo.findAndUpdateOrCreateContaFixa(usuarioId, 'Cartão Douglas', totalMorr, ...);
  // ^^^ Atualiza no usuário 1 (Dodo) - NÃO ENVIA para usuário 2 (Vitória)!\n}
```

### 3. **Falta de logs de debug**

O serviço de sincronização não tinha logs detalhados para rastrear execução ou erros.

---

## ✅ Soluções Aplicadas

### 1. **Script SQL para configurar regras**

Criado `scripts/configurar_regras_sync.sql` que adiciona as regras padrão:

```json
[
  {
    "tipo": "COPIA_TOTAL",
    "terceiroOrigem": "Morr",
    "usuarioDestino": 2,
    "contaDestino": "Cartão Douglas",
    "ativo": true
  },
  {
    "tipo": "DIVISAO_CASA",
    "terceiroOrigem": "Casa",
    "usuarioDestino": 2,
    "valorMinimo": 750,
    "terceiroEspelhoNoOrigem": "Morr",
    "ativo": true
  }
]
```

### 2. **Bot Telegram atualizado**

O método `sincronizarFaturaMorr()` agora:
1. Busca regras dinâmicas do usuário
2. Executa `executarSincronizacaoDinamica()` com as regras
3. Faz fallback para lógica legacy se não houver regras (compatibilidade)
4. Logs detalhados para debugging

### 3. **Logs aprimorados no serviço**

Adicionados logs estruturados com emojis para fácil identificação:
- `��` Início da sincronização
- `��` Busca de valores
- `��` Valores encontrados
- `��` Atualizações sendo feitas
- `✅` Sucesso
- `❌` Erros com stack trace

---

## �� Como Resolver em Produção

### Passo 1: Executar script SQL

Conectar ao banco de produção e executar:

```bash
psql -U postgres -d contas_a_pagar -f scripts/configurar_regras_sync.sql
```

Ou rodar a query manualmente:

```sql
UPDATE usuarios
SET configuracoes = jsonb_set(
  COALESCE(configuracoes, '{}'::jsonb),
  '{regras_sync}',
  '[{"tipo":"COPIA_TOTAL","terceiroOrigem":"Morr","usuarioDestino":2,"contaDestino":"Cartão Douglas","ativo":true}]'::jsonb
)
WHERE id = 1;
```

### Passo 2: Verificar no Render

Após deploy, verificar logs ao executar sincronização:

```
[SYNC] �� Iniciando sincronização dinâmica para usuário 1, mês 6/2026
[SYNC] �� 2 regra(s) encontrada(s)
[SYNC] �� COPIA_TOTAL: Buscando total de 'Morr' (U:1) para mês 6/2026
[SYNC] �� Total encontrado: R$ 1234.56
[SYNC] �� Atualizando/criando 'Cartão Douglas' para usuário destino (U:2)
[SYNC] ✅ Copiado R$ 1234.56 de 'Morr' (U:1) -> 'Cartão Douglas' (U:2)
[SYNC] ✅ Regra COPIA_TOTAL processada em 245ms
[SYNC] �� Sincronização concluída: 2 regra(s) processadas, 0 erro(s)
```

### Passo 3: Testar via API

```bash
curl -X POST "https://<seu-app>.onrender.com/api/sincronizar?mes=6&ano=2026" \
  -H "Authorization: Bearer <token-do-dodo>"
```

---

## �� Checklist de Validação

- [ ] Script SQL executado no banco de produção
- [ ] Deploy do código atualizado (bot + syncService)
- [ ] Logs do Render mostram execução bem-sucedida
- [ ] Lançamento "Cartão Douglas" aparece no dashboard da Vitória (ID 2)
- [ ] Teste unitário passa: `npm test syncService`

---

## �� Prevenção Futura

1. **Adicionar validação no setup**: Verificar se regras existem no primeiro login
2. **Criar dashboard admin**: Interface para gerenciar regras sem SQL
3. **Monitoramento**: Alerta quando sincronização falhar
4. **Testes E2E**: Testar fluxo completo Dodo → Vitória periodicamente

---

## �� Arquivos Modificados

- `src/modules/botTelegram/telegramBot.js` - Atualizado para usar sync dinâmico
- `src/services/syncService.js` - Logs aprimorados
- `scripts/configurar_regras_sync.sql` - NOVO: Script de configuração
- `docs/BUG-SINCRONIZACAO-MORR.md` - Este documento
