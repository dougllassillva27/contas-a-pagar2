# Sync de Código: main → taya

## Objetivo

Manter a instância da Taya atualizada com correções de segurança, bugfixes e melhorias desenvolvidas na branch `main`, sem quebrar a estabilidade da instância dela.

---

## Quando Sincronizar

- **Correções de segurança** (urgente)
- **Bugfixes críticos** que afetam funcionalidade core
- **Melhorias de performance** relevantes
- **Novas features** testadas e estáveis em `main`

**Frequência recomendada:** A cada 2-4 semanas, ou imediatamente se houver fix de segurança.

---

## Procedimento de Merge

### 1. Preparar Ambiente Local

```bash
# Garantir que está na branch taya
git checkout taya

# Buscar últimas mudanças do remoto
git fetch origin
```

### 2. Merge de main para taya

```bash
# Merge main em taya
git merge origin/main
```

**Se houver conflitos:**

```bash
# Ver arquivos conflitantes
git status

# Resolver conflitos manualmente em cada arquivo
# Depois:
git add <arquivo-resolvido>
git commit
```

### 3. Testar Localmente (Opcional mas Recomendado)

```bash
# Rodar testes para validar merge
npm test

# Se quiser testar manualmente com database local:
npm run dev
```

### 4. Push para GitHub

```bash
# Push taya atualizada para GitHub
git push origin taya
```

### 5. Verificar Deploy no Render

- Acessar dashboard Render → serviço `contas-a-pagar-taya`
- Aguardar deploy automático (triggered pelo push na branch `taya`)
- Validar health check: `https://contas-a-pagar-taya.onrender.com/health`
- Testar funcionalidades críticas (login, dashboard, lançamentos)

---

## Estratégia Alternativa: Cherry-Pick Seletivo

Se `main` tiver muitas mudanças e você quiser apenas fixes específicos:

```bash
# Na branch taya
git checkout taya

# Cherry-pick commits específicos de main
git cherry-pick <commit-hash-1> <commit-hash-2>

# Resolver conflitos se houver
git push origin taya
```

**Quando usar cherry-pick:**
- Divergência grande entre branches
- Apenas 1-2 fixes críticos necessários
- Features de main ainda não testadas o suficiente

---

## Boas Práticas

1. **Nunca force push** na branch `taya` (pode quebrar histórico do Render)
2. **Sempre teste após merge** — mesmo que `npm test` passe, valide manualmente no deploy
3. **Documente merges** no `resumo-de-trabalho.md` com tag `:sync`
4. **Comunique a Taya** antes de merges grandes (pode causar downtime de 2-3 min)
5. **Mantenha branches alinhadas** — merges frequentes evitam conflitos complexos

---

## Rollback (Se Algo Der Errado)

Se o merge quebrar a instância da Taya:

```bash
# Reverter último merge local
git reset --hard HEAD~1

# Forçar push do estado anterior (CUIDADO: sobrescreve histórico remoto)
git push origin taya --force
```

**Alternativa mais segura:**

```bash
# Reverter merge criando novo commit
git revert HEAD
git push origin taya
```

---

## Checklist de Validação Pós-Merge

- [ ] `npm test` passa localmente
- [ ] Deploy no Render completou sem erros
- [ ] Health check retorna `{"status": "ok"}`
- [ ] Login funciona (criar usuário de teste se necessário)
- [ ] Dashboard carrega sem erros no console
- [ ] Lançamentos CRUD funcionam (criar, editar, deletar)
- [ ] Portal de terceiros acessível (se aplicável)
- [ ] Bot Telegram responde (se configurado)

---

## Contato e Suporte

Se a Taya reportar problemas após sync:

1. Verificar logs no Render dashboard
2. Checar health check `/health`
3. Validar connection string do Neon (DATABASE_URL)
4. Revisar últimos commits merged (`git log main..taya`)
5. Se necessário, fazer rollback imediato

---

**Última atualização:** 2026-07-18
**Responsável:** Douglas Silva
