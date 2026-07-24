# Feature: Alterar Senha

**Status**: Planejamento  
**Prioridade**: Alta  
**Data**: 2026-07-24  
**Autor**: Douglas Silva + Claude Code

---

## 1. Visão Geral

Funcionalidade para usuários logados alterarem sua senha através de uma interface segura no modal de configurações. A alteração invalida todas as sessões ativas do usuário em todos os dispositivos, forçando re-login com a nova credencial.

---

## 2. Objetivos

- Permitir que usuários alterem sua senha quando logados
- Garantir segurança máxima sem expor dados sensíveis no frontend
- Invalidar todas as sessões ativas após alteração (proteção contra acesso não autorizado)
- Manter simplicidade na UX (sem exigir senha atual)

---

## 3. Requisitos Funcionais

### 3.1 Interface do Usuário

- **RF01**: Modal/aba dentro das configurações com campos:
  - Nova senha (input type="password")
  - Confirmar nova senha (input type="password")
- **RF02**: Validação client-side de match entre os dois campos (UX only)
- **RF03**: Feedback visual de sucesso/erro sem expor detalhes técnicos
- **RF04**: Logout automático após alteração bem-sucedida

### 3.2 Backend

- **RF05**: Endpoint `POST /api/auth/trocar-senha` protegido por autenticação
- **RF06**: Validação server-side de match entre nova senha e confirmação
- **RF07**: Hash da nova senha com bcrypt (cost 12)
- **RF08**: Incremento do campo `passwordVersion` na tabela `Usuarios`
- **RF09**: Limpeza de todos os `TokensPersistentes` do usuário
- **RF10**: Rate limit geral da API (apiLimiter existente)

### 3.3 Segurança

- **RF11**: Middleware valida `session.passwordVersion` vs `usuario.passwordVersion` a cada request
- **RF12**: Se divergência detectada → 401 + logout forçado + limpeza de TokensPersistentes
- **RF13**: Mensagens de erro genéricas ("Erro ao alterar senha") sem revelar critérios
- **RF14**: Senha nunca é retornada ao frontend (nem em logs)

---

## 4. Requisitos Não-Funcionais

### 4.1 Segurança

- **RNF01**: Sem política de complexidade de senha (qualquer senha aceita)
- **RNF02**: Sem exigência de senha atual (apenas estar logado)
- **RNF03**: Invalidação 100% de sessões em todos os dispositivos
- **RNF04**: Proteção contra brute force via rate limit geral

### 4.2 Performance

- **RNF05**: Operação deve completar em <2s (bcrypt + UPDATE + DELETE)
- **RNF06**: Sem impacto em outras operações do sistema

### 4.3 Compatibilidade

- **RNF07**: Compatível com instância Taya (branch isolada)
- **RNF08**: Migration reversível (campo passwordVersion com default 0)

---

## 5. Arquitetura Proposta

### 5.1 Banco de Dados

```sql
-- Adicionar campo passwordVersion na tabela Usuarios
ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS passwordVersion INT DEFAULT 0;
```

**Estrutura atualizada:**
```sql
Usuarios (
    Id SERIAL PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Senha VARCHAR(255) NOT NULL,
    passwordVersion INT DEFAULT 0,  -- NOVO
    -- ... outros campos
)
```

### 5.2 Backend

**Endpoint:**
```
POST /api/auth/trocar-senha
Headers: Cookie (session)
Body: {
  "novaSenha": "string",
  "confirmarSenha": "string"
}
```

**Respostas:**
- `200 OK`: `{ "success": true, "message": "Senha alterada com sucesso" }`
- `400 Bad Request`: `{ "success": false, "error": "As senhas não coincidem" }`
- `401 Unauthorized`: `{ "success": false, "error": "Sessão expirada" }`
- `500 Internal Server Error`: `{ "success": false, "error": "Erro ao alterar senha" }`

**Fluxo:**
1. Validar match entre `novaSenha` e `confirmarSenha`
2. Hash da nova senha com bcrypt (cost 12)
3. UPDATE `Usuarios` SET `Senha` = hash, `passwordVersion` = `passwordVersion` + 1 WHERE `Id` = session.userId
4. DELETE FROM `TokensPersistentes` WHERE `UsuarioId` = session.userId
5. Destruir sessão atual (req.session.destroy())
6. Retornar 200

### 5.3 Frontend

**Modal de Configurações:**
- Nova aba/seção "Alterar Senha"
- Campos: nova senha + confirmar senha
- Botão "Salvar" com validação client-side de match
- Loading state durante requisição
- Modal de sucesso com redirect para login após 2s

**JavaScript:**
```javascript
async function trocarSenha() {
  const novaSenha = document.getElementById('novaSenha').value;
  const confirmarSenha = document.getElementById('confirmarSenha').value;
  
  if (novaSenha !== confirmarSenha) {
    mostrarErro('As senhas não coincidem');
    return;
  }
  
  const response = await fetch('/api/auth/trocar-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novaSenha, confirmarSenha })
  });
  
  if (response.ok) {
    mostrarSucesso('Senha alterada com sucesso');
    setTimeout(() => window.location.href = '/login', 2000);
  } else {
    mostrarErro('Erro ao alterar senha');
  }
}
```

### 5.4 Middleware de Validação

**Arquivo:** `src/middlewares/auth.js`

```javascript
// Após validar sessão, verificar passwordVersion
if (req.session.passwordVersion !== usuario.passwordVersion) {
  req.session.destroy();
  return res.status(401).json({ error: 'Sessão expirada' });
}
```

---

## 6. Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário logado abre modal de configurações              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Clica em "Alterar Senha"                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Preenche: nova senha + confirmar senha                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend valida match (client-side)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. POST /api/auth/trocar-senha                             │
│    Body: { novaSenha, confirmarSenha }                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Backend valida match (server-side)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. bcrypt hash da nova senha (cost 12)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. UPDATE Usuarios SET Senha=hash,                         │
│    passwordVersion=passwordVersion+1 WHERE Id=userId       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. DELETE FROM TokensPersistentes WHERE UsuarioId=userId   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. req.session.destroy()                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. Retorna 200 OK                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 12. Frontend mostra sucesso + redirect para /login após 2s │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 13. Usuário faz login com nova senha                       │
│     (sessão carrega novo passwordVersion)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Considerações de Segurança

### 7.1 Ameaças Mitigadas

- **Sessão comprometida**: Invalidação total previne uso continuado
- **Brute force**: Rate limit geral protege endpoint
- **Exposição de dados**: Senha nunca retorna ao frontend
- **TokensPersistentes roubados**: Limpeza completa após alteração

### 7.2 Trade-offs Aceitos

| Decisão | Risco | Mitigação |
|---------|-------|-----------|
| Sem senha atual | Se alguém acessar tela desbloqueada, pode trocar | Sessões expiram em 24h |
| Sem política de força | Usuário pode escolher senha fraca | Rate limit + monitoramento |
| Invalidação total | Usuário perde sessões em todos dispositivos | Aceitável para UX de segurança |

### 7.3 O que NÃO fazer

- ❌ Exibir senha atual no frontend
- ❌ Retornar senha em logs ou respostas
- ❌ Validar complexidade no frontend (só backend)
- ❌ Mensagens de erro detalhadas ("senha muito curta", "falta caractere especial")
- ❌ Armazenar senha em plaintext em qualquer lugar

---

## 8. Critérios de Aceite

- [ ] Modal de configurações tem aba/seção "Alterar Senha"
- [ ] Campos nova senha + confirmar senha funcionam
- [ ] Validação client-side de match funciona
- [ ] Endpoint POST /api/auth/trocar-senha retorna 200 em sucesso
- [ ] Senha é atualizada no banco com bcrypt hash
- [ ] passwordVersion é incrementado
- [ ] TokensPersistentes são limpos
- [ ] Sessão atual é destruída
- [ ] Middleware valida passwordVersion em cada request
- [ ] Sessões divergentes recebem 401
- [ ] Frontend faz logout automático após sucesso
- [ ] Rate limit geral protege endpoint
- [ ] Mensagens de erro são genéricas
- [ ] Testes unitários cobrindo backend
- [ ] Testes manuais cobrindo frontend

---

## 9. Arquivos Afetados

### Backend
- `src/repositories/UsuarioRepository.js` (adicionar método `atualizarSenha`)
- `src/routes/authRoutes.js` (adicionar endpoint POST /trocar-senha)
- `src/middlewares/auth.js` (adicionar validação passwordVersion)
- `src/helpers/initDatabase.js` (migration passwordVersion)

### Frontend
- `public/js/ui.js` (função trocarSenha)
- `src/views/partials/modals.ejs` (HTML do modal)

### Testes
- `__tests__/routes/authRoutes.test.js` (testes do endpoint)
- `__tests__/repositories/UsuarioRepository.test.js` (testes do método)

---

## 10. Dependências

- bcrypt (já instalado)
- express-session (já configurado)
- pg (já configurado)
- apiLimiter (já existe)

---

## 11. Rollback

Se algo der errado:

1. Reverter commits
2. Campo `passwordVersion` pode ser removido (default 0 não quebra nada)
3. Middleware volta a validar sem passwordVersion
4. Endpoint removido

---

## 12. Próximos Passos

1. ✅ Brainstorming concluído
2. ⏳ Planejamento detalhado (gsdplanner)
3. ⏳ Implementação backend
4. ⏳ Implementação frontend
5. ⏳ Testes unitários
6. ⏳ Testes manuais
7. ⏳ Code review
8. ⏳ Merge para main
