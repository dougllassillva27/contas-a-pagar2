# 🧪 Testes Automatizados

## Pré-requisitos

As dependências de teste já estão no `package.json` (devDependencies):

- **Jest** — framework de testes
- **Supertest** — simula requisições HTTP

Se precisar reinstalar:

```bash
npm install
```

---

## Como Rodar

### Todos os testes (recomendado antes de cada commit)

```bash
npm test
```

### Só os testes unitários (rápido, não precisa de banco)

```bash
npm run test:unit
```

### Só os testes de integração (precisa do banco Neon online)

```bash
npm run test:integration
```

### Um arquivo específico

```bash
npx jest __tests__/helpers/parseHelpers.test.js
```

---

## Estrutura dos Testes

```
__tests__/
├── helpers/
│   └── parseHelpers.test.js    ← Funções utilitárias (27 testes)
├── middlewares/
│   └── auth.test.js            ← Autenticação web e API (7 testes)
└── integration/
    └── api.test.js             ← Rotas HTTP reais (12 testes)
```

## Tipos de Teste

| Tipo            | O que testa                          | Precisa de banco? | Velocidade |
| --------------- | ------------------------------------ | :---------------: | :--------: |
| **Unitário**    | Funções isoladas, helpers, constants |      ❌ Não       |  ⚡ ~2ms   |
| **Repositório** | Queries de banco com Mock (pg)       |      ❌ Não       |  ⚡ ~5ms   |
| **Módulos**     | Rotas isoladas por contexto          |      ❌ Não       |  ⚡ ~10ms  |
| **Integração**  | Roteador Principal + regras de fluxo |      ✅ Sim       |   🔄 ~3s   |

## Quando Rodar?

| Situação                         | Comando                    |
| -------------------------------- | -------------------------- |
| Antes de cada `git commit`       | `npm test`                 |
| Alterou `parseHelpers.js`        | `npm run test:unit`        |
| Alterou rotas ou banco           | `npm run test:integration` |
| Quer testar tudo antes do deploy | `npm test`                 |

---

## Como Ler o Resultado

### ✅ Tudo certo

```
Test Suites: 3 passed, 3 total
Tests:       47 passed, 47 total
```

### ❌ Algo quebrou

```
Test Suites: 1 failed, 2 passed, 3 total
Tests:       1 failed, 46 passed, 47 total

  ● parseValor › converte "R$ 1.234,56" para 1234.56

    expect(received).toBe(expected)

    Expected: 1234.56
    Received: 0
```

→ O Jest mostra **exatamente qual teste falhou** e o que era esperado vs. o que retornou.

---

## Como Criar um Novo Teste

1. Crie um arquivo `.test.js` na pasta adequada
2. Use o padrão:

```javascript
// Importa o que vai testar
const { minhaFuncao } = require('../../src/caminho/do/modulo');

// Agrupa testes relacionados
describe('minhaFuncao', () => {
  // Cada cenário é um test()
  test('deve retornar X quando recebe Y', () => {
    const resultado = minhaFuncao('Y');
    expect(resultado).toBe('X');
  });

  test('deve retornar erro para input inválido', () => {
    expect(minhaFuncao(null)).toBeNull();
  });
});
```

3. Rode: `npm test`

---

## Dicas

- **Nomeie os testes em português** — fica mais fácil de entender
- **Teste os casos de erro** — null, vazio, inválido
- **Um `test()` = um cenário** — não coloque tudo junto
- **Se o teste precisa de banco**, coloque em `integration/`
- **Se não precisa de banco**, coloque em `helpers/` ou `middlewares/`
