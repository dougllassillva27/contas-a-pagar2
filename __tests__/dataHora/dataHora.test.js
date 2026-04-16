const request = require('supertest');
const express = require('express');
const dataHoraRoutes = require('../../src/modules/dataHora/dataHoraRoutes');

// Cria uma instância limpa do Express apenas para testar a rota isolada
const app = express();
app.use('/dataHora', dataHoraRoutes);

describe('Módulo dataHora - Testes de Fuso Horário', () => {
  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste para evitar poluição entre eles
    jest.restoreAllMocks();
  });

  it('Deve extrair e formatar a data/hora corretamente ignorando o fuso do servidor', async () => {
    // Mock do global.fetch simulando a resposta exata da API da RapidAPI
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            datetime: '2026-04-16T10:08:21.900-03:00',
            timezone: 'America/Sao_Paulo',
          }),
      })
    );

    // Dispara a requisição contra o nosso endpoint JSON
    const response = await request(app).get('/dataHora/json');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // VALIDAÇÃO PRINCIPAL: Garante que o split extraiu o 10:08 corretamente
    expect(response.body.dataHoraFormatada).toBe('16/04/2026 10:08');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('Deve lidar com falhas da API externa graciosamente', async () => {
    // Mock do global.fetch simulando um erro 502 Bad Gateway
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 502,
        text: () => Promise.resolve('Bad Gateway'),
      })
    );

    const response = await request(app).get('/dataHora/json');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Erro na API externa: 502 - Bad Gateway');
  });
});
