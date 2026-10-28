// ==============================================================================
// 🧪 TESTES — Configurações: validação de destino das regras de sincronização
//
// O router das rotas é criado no módulo (padrão do projeto), então a app de teste
// é montada uma única vez e cada caso limpa os mocks antes de rodar.
// ==============================================================================

jest.mock('../../src/config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

const request = require('supertest');
const express = require('express');
const session = require('express-session');

const configuracoesRoutes = require('../../src/routes/configuracoes/configuracoesRoutes');

const USUARIO = { id: 1, nome: 'Dodo', login: 'dodo' };

const repo = {
  saveConfiguracao: jest.fn().mockResolvedValue(),
  invalidateCache: jest.fn(),
  toggleMesFechado: jest.fn().mockResolvedValue(true),
};

const app = express();
app.use(express.json());
app.use(session({ secret: 'teste', resave: false, saveUninitialized: true, cookie: { secure: false } }));
app.use((req, res, next) => {
  req.session.user = USUARIO;
  next();
});
app.use(configuracoesRoutes(repo));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/configuracoes (regras_sync)', () => {
  test('aceita regra com destino dentro do domicílio autorizado', async () => {
    const res = await request(app)
      .post('/api/configuracoes')
      .send({
        chave: 'regras_sync',
        valor: [{ tipo: 'COPIAR_CONTAS', terceiroOrigem: 'Casa', usuarioDestino: 2, contaDestino: 'Cartão' }],
      });

    expect(res.status).toBe(200);
    expect(repo.saveConfiguracao).toHaveBeenCalledWith(1, 'regras_sync', expect.any(Array));
  });

  test('recusa regra com destino fora do domicílio autorizado', async () => {
    const res = await request(app)
      .post('/api/configuracoes')
      .send({
        chave: 'regras_sync',
        valor: [{ tipo: 'COPIAR_CONTAS', terceiroOrigem: 'Casa', usuarioDestino: 99, contaDestino: 'Aluguel' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/destino não autorizado/i);
    expect(repo.saveConfiguracao).not.toHaveBeenCalled();
  });

  test('recusa regras_sync que não é lista', async () => {
    const res = await request(app)
      .post('/api/configuracoes')
      .send({ chave: 'regras_sync', valor: '{"tipo":"COPIAR_CONTAS"}' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lista de regras/i);
    expect(repo.saveConfiguracao).not.toHaveBeenCalled();
  });

  test('mantém outras chaves funcionando (whatsapp_template)', async () => {
    const res = await request(app)
      .post('/api/configuracoes')
      .send({ chave: 'whatsapp_template', valor: 'Olá {nome_terceiro}' });

    expect(res.status).toBe(200);
    expect(repo.saveConfiguracao).toHaveBeenCalledWith(1, 'whatsapp_template', 'Olá {nome_terceiro}');
  });
});
