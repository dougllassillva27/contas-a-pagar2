// ==============================================================================
// 🧪 Testes do Gerenciador de Conversas do Telegram..
// ==============================================================================

const { ETAPAS, iniciarConversa, obterConversa, avancarConversa, finalizarConversa, cancelarConversa, calcularProximaEtapa } = require('../../src/modules/botTelegram/conversationManager');

describe('conversationManager', () => {
  const CHAT_ID = '12345';

  beforeEach(() => {
    // Limpa conversas entre testes
    cancelarConversa(CHAT_ID);
  });

  // ============================================================
  // Ciclo de vida da conversa
  // ============================================================

  test('iniciarConversa — cria estado na etapa USUARIO', () => {
    iniciarConversa(CHAT_ID);
    const conversa = obterConversa(CHAT_ID);

    expect(conversa).not.toBeNull();
    expect(conversa.etapa).toBe(ETAPAS.USUARIO);
    expect(conversa.dados).toEqual({});
  });

  test('obterConversa — retorna null se não há conversa', () => {
    expect(obterConversa('inexistente')).toBeNull();
  });

  test('cancelarConversa — remove a conversa', () => {
    iniciarConversa(CHAT_ID);
    cancelarConversa(CHAT_ID);

    expect(obterConversa(CHAT_ID)).toBeNull();
  });

  test('finalizarConversa — retorna dados e limpa o estado', () => {
    iniciarConversa(CHAT_ID);
    avancarConversa(CHAT_ID, 'usuarioId', 1);
    avancarConversa(CHAT_ID, 'descricao', 'Internet');

    const dados = finalizarConversa(CHAT_ID);

    expect(dados.usuarioId).toBe(1);
    expect(dados.descricao).toBe('Internet');
    expect(obterConversa(CHAT_ID)).toBeNull();
  });

  test('finalizarConversa — retorna null se não há conversa', () => {
    expect(finalizarConversa('inexistente')).toBeNull();
  });

  // ============================================================
  // Fluxo de etapas
  // ============================================================

  test('fluxo completo SEM parcelas (tipo fixa)', () => {
    iniciarConversa(CHAT_ID);

    let proxima;
    proxima = avancarConversa(CHAT_ID, 'usuarioId', 1);
    expect(proxima).toBe(ETAPAS.DESCRICAO);

    proxima = avancarConversa(CHAT_ID, 'descricao', 'Internet');
    expect(proxima).toBe(ETAPAS.VALOR);

    proxima = avancarConversa(CHAT_ID, 'valor', 100);
    expect(proxima).toBe(ETAPAS.TIPO);

    // Tipo fixa → pula parcelas → vai para terceiro
    const conversa = obterConversa(CHAT_ID);
    conversa.dados.tipo = 'fixa';
    proxima = avancarConversa(CHAT_ID, 'tipo', 'fixa');
    expect(proxima).toBe(ETAPAS.TERCEIRO);

    // Terceiro → finaliza
    proxima = avancarConversa(CHAT_ID, 'terceiro', null);
    expect(proxima).toBeNull();
  });

  test('fluxo completo COM parcelas (tipo parcelada)', () => {
    iniciarConversa(CHAT_ID);

    avancarConversa(CHAT_ID, 'usuarioId', 1);
    avancarConversa(CHAT_ID, 'descricao', 'Tênis');
    avancarConversa(CHAT_ID, 'valor', 500);

    // Tipo parcelada → vai para parcelas
    const conversa = obterConversa(CHAT_ID);
    conversa.dados.tipo = 'parcelada';
    const proxima = avancarConversa(CHAT_ID, 'tipo', 'parcelada');
    expect(proxima).toBe(ETAPAS.PARCELAS);

    // Parcelas → terceiro
    const proxima2 = avancarConversa(CHAT_ID, 'parcelas', '10');
    expect(proxima2).toBe(ETAPAS.TERCEIRO);
  });

  test('fluxo tipo "unica" — pula parcelas', () => {
    iniciarConversa(CHAT_ID);

    avancarConversa(CHAT_ID, 'usuarioId', 2);
    avancarConversa(CHAT_ID, 'descricao', 'Mercado');
    avancarConversa(CHAT_ID, 'valor', 250);

    const conversa = obterConversa(CHAT_ID);
    conversa.dados.tipo = 'unica';
    const proxima = avancarConversa(CHAT_ID, 'tipo', 'unica');
    expect(proxima).toBe(ETAPAS.TERCEIRO);
  });

  // ============================================================
  // calcularProximaEtapa (função pura)
  // ============================================================

  test('USUARIO → DESCRICAO', () => {
    expect(calcularProximaEtapa(ETAPAS.USUARIO, {})).toBe(ETAPAS.DESCRICAO);
  });

  test('DESCRICAO → VALOR', () => {
    expect(calcularProximaEtapa(ETAPAS.DESCRICAO, {})).toBe(ETAPAS.VALOR);
  });

  test('VALOR → TIPO', () => {
    expect(calcularProximaEtapa(ETAPAS.VALOR, {})).toBe(ETAPAS.TIPO);
  });

  test('TIPO (fixa) → TERCEIRO', () => {
    expect(calcularProximaEtapa(ETAPAS.TIPO, { tipo: 'fixa' })).toBe(ETAPAS.TERCEIRO);
  });

  test('TIPO (parcelada) → PARCELAS', () => {
    expect(calcularProximaEtapa(ETAPAS.TIPO, { tipo: 'parcelada' })).toBe(ETAPAS.PARCELAS);
  });

  test('PARCELAS → TERCEIRO', () => {
    expect(calcularProximaEtapa(ETAPAS.PARCELAS, {})).toBe(ETAPAS.TERCEIRO);
  });

  test('TERCEIRO → null (fim)', () => {
    expect(calcularProximaEtapa(ETAPAS.TERCEIRO, {})).toBeNull();
  });
});
