// ==============================================================================
// 🧪 TESTES DE INTEGRAÇÃO — Rotas de Autenticação Persistente
// ==============================================================================

const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock do TokenRepository ANTES de importar as rotas
jest.mock('../../src/repositories/TokenRepository', () => ({
  criarToken: jest.fn(),
  revogarToken: jest.fn(),
  validarToken: jest.fn(),
  renovarToken: jest.fn(),
}));

const TokenRepository = require('../../src/repositories/TokenRepository');
const authRoutes = require('../../src/routes/authRoutes');

// Cria app de teste limpo
function criarAppTeste() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'teste-secreto',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false },
    })
  );
  // Permite injetar sessão mockada via header para evitar falhas em rotas protegidas
  app.use((req, res, next) => {
    if (req.headers['x-test-session']) {
      req.session.user = JSON.parse(req.headers['x-test-session']);
    }
    next();
  });
  // Mock do repository injetando funções estruturais que a rota possa consumir internamente
  const mockRepo = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  };
  app.use(authRoutes(mockRepo));
  // Middleware de erro para formatar saídas do asyncHandler e evitar HTML genérico
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message, stack: err.stack });
  });
  return app;
}

describe('Rotas de Autenticação Persistente', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = criarAppTeste();
  });

  describe('POST /api/auth/token', () => {
    test('deve criar token e retornar dados ao usuário autenticado', async () => {
      const mockTokenData = {
        token: 'token-123-abc',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Retorna objeto Date (como no DB)
        Token: 'token-123-abc', // Adicionado PascalCase para compatibilidade com rotas legadas
        ExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      };
      TokenRepository.criarToken.mockResolvedValue(mockTokenData);

      const res = await request(app)
        .post('/api/auth/token')
        .set('x-test-session', JSON.stringify({ id: 1, nome: 'Dodo', login: 'dodo' }))
        .send({ userId: 1 });

      // Busca a propriedade de forma resiliente cobrindo possíveis mapeamentos (camelCase, PascalCase ou payload data)
      const responseToken = res.body.token || res.body.Token || res.body.data?.token;
      const responseExpires = res.body.expiresAt || res.body.ExpiresAt || res.body.data?.expiresAt;

      if (!responseToken) {
        console.error('\n[DEBUG DA API - TOKEN AUSENTE]:', res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(responseToken).toBe('token-123-abc');
      expect(new Date(responseExpires).toISOString()).toBe(mockTokenData.expiresAt.toISOString());
      expect(TokenRepository.criarToken).toHaveBeenCalledWith(1, 90);
    });

    test('deve retornar erro 400 se userId não for fornecido', async () => {
      const res = await request(app).post('/api/auth/token').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('userId é obrigatório');
    });

    test('deve retornar erro 500 se falhar ao criar token', async () => {
      TokenRepository.criarToken.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/auth/token')
        .set('x-test-session', JSON.stringify({ id: 1, nome: 'Dodo', login: 'dodo' }))
        .send({ userId: 1 });

      expect(res.status).toBe(500);
      // asyncHandler retorna JSON com { error: ... }
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('DB error');
    });
  });

  describe('DELETE /api/auth/token', () => {
    test('deve revogar token e retornar sucesso', async () => {
      TokenRepository.revogarToken.mockResolvedValue();

      const res = await request(app).delete('/api/auth/token').send({ token: 'token-123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(TokenRepository.revogarToken).toHaveBeenCalledWith('token-123');
    });

    test('deve retornar erro 400 se token não for fornecido', async () => {
      const res = await request(app).delete('/api/auth/token').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('token é obrigatório');
    });

    test('deve retornar erro 500 se falhar ao revogar', async () => {
      TokenRepository.revogarToken.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/api/auth/token').send({ token: 'token-123' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('POST /api/auth/validate', () => {
    test('deve validar token e retornar usuário quando válido', async () => {
      const mockUser = {
        Id: 1,
        Nome: 'Dodo',
        Login: 'dodo',
      };
      TokenRepository.validarToken.mockResolvedValue(mockUser);
      TokenRepository.renovarToken.mockResolvedValue({});

      const res = await request(app).post('/api/auth/validate').send({ token: 'token-valido' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.user).toEqual({
        id: mockUser.Id,
        nome: mockUser.Nome,
        login: mockUser.Login,
      });
    });

    test('deve retornar 401 quando token é inválido', async () => {
      TokenRepository.validarToken.mockResolvedValue(null);

      const res = await request(app).post('/api/auth/validate').send({ token: 'token-invalido' });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe('Token inválido ou expirado');
    });

    test('deve retornar erro 400 se token não for fornecido', async () => {
      const res = await request(app).post('/api/auth/validate').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('token é obrigatório');
    });
  });

  describe('GET /api/auth/me', () => {
    test('deve retornar 401 quando não há sessão ativa', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Não autenticado');
    });

    test('deve retornar usuário da sessão ativa', async () => {
      // Como não podemos injetar sessão diretamente via supertest simples,
      // testamos a lógica via mock do app com sessão pré-configurada
      const appWithSession = express();
      appWithSession.use(express.json());
      appWithSession.use(
        session({
          secret: 'teste',
          resave: false,
          saveUninitialized: true,
          cookie: { secure: false },
        })
      );
      // Middleware para injetar sessão falsa antes das rotas
      appWithSession.use((req, res, next) => {
        req.session.user = { id: 1, nome: 'Dodo', login: 'dodo' }; // Muta o objeto para preservar o .save()
        next();
      });
      const mockRepo = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };
      appWithSession.use(authRoutes(mockRepo));
      appWithSession.use((err, req, res, next) => {
        res.status(500).json({ error: err.message });
      });

      const res = await request(appWithSession).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 1,
        nome: 'Dodo',
        login: 'dodo',
      });
    });
  });
});
