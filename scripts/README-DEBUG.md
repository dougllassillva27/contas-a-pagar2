# �� Habilitando Debug de Performance

## Variáveis de Ambiente

Para monitorar performance da sincronização, defina no ambiente do Render:

```bash
DEBUG_PERF=true
```

## Logs Produzidos

Com `DEBUG_PERF=true`, cada operação de sincronização gera:

```
[SYNC-PERF] Regra COPIA_TOTAL processada em 245ms
[SYNC-PERF] Regra DIVISAO_CASA processada em 189ms
[SYNC-PERF] Ciclo total de sincronização: 434ms
```

## Como Configurar no Render

1. Acesse: https://dashboard.render.com/
2. Selecione seu serviço
3. Vá em **Environment Variables**
4. Adicione: `DEBUG_PERF = true`
5. Redeploy automático

## Logs Normais (Sem DEBUG_PERF)

Mesmo sem `DEBUG_PERF`, os logs padrão mostram:

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

## Interpretando Logs

### Sucesso
```
[SYNC] ✅ Copiado R$ X de 'Origem' (U:Y) -> 'Destino' (U:Z)
```
→ Sincronização funcionou corretamente

### Erro
```
[SYNC] ❌ Erro ao processar regra COPIA_TOTAL: relação "usuarios" não existe
[SYNC] Stack: error: relation "usuarios" does not exist
```
→ Problema no banco de dados ou conexão

### Aviso
```
[SYNC] ⚠️ Nenhuma regra configurada para usuário 1
```
→ Usuário não tem `configuracoes.regras_sync` definidas
