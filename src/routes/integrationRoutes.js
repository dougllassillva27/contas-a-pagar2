// ==============================================================================
// 🔌 INTEGRAÇÃO ANDROID (API)
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

const express = require('express');
const router = express.Router();
const { parseValor, normalizarTipoIntegracao, normalizarParcelasPorTipo } = require('../helpers/parseHelpers');
const { normalizarTerceiro } = require('../repositories/LancamentoRepository');
const { STATUS, TIPO } = require('../constants');

const { integracaoLimiter } = require('../middlewares/rateLimiter');

module.exports = function (repo, apiAuth) {
  /**
   * Rota de integração Android:
   * Espera algo como:
   * {
   *   "usuario_id": 1,
   *   "descricao": "Internet",
   *   "valor": "R$ 100,00",
   *   "tipo": "fixa" | "unica" | "parcelada",
   *   "parcelas": "" | "10" | "1/10",
   *   "terceiro": "..."
   * }
   *
   * Melhorias aplicadas:
   * - Se tipo NÃO for parcelada: ignora parcelas (salva null/null)
   * - Se tipo for parcelada: valida e aceita "10" ou "1/10"
   */
  router.post('/api/v1/integracao/lancamentos', integracaoLimiter, apiAuth, async (req, res) => {
    try {
      const { descricao, valor, tipo, parcelas, total_parcelas, parcela_atual, terceiro, usuario_id } = req.body;

      // Validações básicas
      if (!descricao || typeof descricao !== 'string') {
        return res.status(400).json({ success: false, error: 'Campo "descricao" é obrigatório' });
      }
      if (!valor) {
        return res.status(400).json({ success: false, error: 'Campo "valor" é obrigatório' });
      }
      if (!tipo) {
        return res.status(400).json({ success: false, error: 'Campo "tipo" é obrigatório' });
      }
      if (!usuario_id) {
        return res.status(400).json({ success: false, error: 'Campo "usuario_id" é obrigatório' });
      }

      const idUsuarioFinal = parseInt(usuario_id, 10);
      if (isNaN(idUsuarioFinal) || idUsuarioFinal <= 0) {
        return res.status(400).json({ success: false, error: 'Campo "usuario_id" deve ser um número válido' });
      }

      const valorFinal = parseValor(valor);
      if (isNaN(valorFinal) || valorFinal <= 0) {
        return res.status(400).json({ success: false, error: `Valor inválido: "${valor}". Use formato "100,50" ou "100.50"` });
      }

      // Decide tipo no banco:
      // - "fixa" => FIXA
      // - "parcelada"/"parcelado" => PARCELADO
      // - qualquer outro => CARTAO
      const tipoNorm = normalizarTipoIntegracao(tipo);
      const isFixa = tipoNorm === 'fixa';
      const isParcelada = tipoNorm === 'parcelada' || tipoNorm === 'parcelado';
      const dbTipo = isFixa ? TIPO.FIXA : (isParcelada ? TIPO.PARCELADO : TIPO.CARTAO);

      // Aceita parcelas como string ("2", "1/2") ou campos separados (total_parcelas + parcela_atual)
      let parcelasRaw = parcelas;
      if (!parcelasRaw && total_parcelas) {
        parcelasRaw = parcela_atual ? `${parcela_atual}/${total_parcelas}` : String(total_parcelas);
      }

      const parcelasNorm = normalizarParcelasPorTipo({
        isParcelada,
        parcelasRaw,
      });

      // Se foi parcelada mas veio inválido, retorna 400 com mensagem clara
      if (parcelasNorm.erro) {
        return res.status(400).json({ success: false, error: parcelasNorm.erro });
      }

      // ✅ FIX: Normaliza terceiro "Eu", "Dodo" ou vazio para NULL
      const terceiroNormalizado = normalizarTerceiro(terceiro);

      // ✅ FIX: Aceita mês/ano do cliente para criar lançamento no mês correto
      const dataBase = req.body.month && req.body.year
        ? new Date(parseInt(req.body.year, 10), parseInt(req.body.month, 10) - 1, 10)
        : new Date();

      const dados = {
        descricao,
        valor: valorFinal,
        tipo: dbTipo,
        status: STATUS.PENDENTE,
        parcelaAtual: parcelasNorm.parcelaAtual,
        totalParcelas: parcelasNorm.totalParcelas,
        nomeTerceiro: terceiroNormalizado, // ✅ Usa valor normalizado
        dataBase,
      };

      await repo.addLancamento(idUsuarioFinal, dados);

      return res.status(201).json({
        success: true,
        message: 'Lançamento Confirmado',
        data: {
          dono: idUsuarioFinal === 1 ? 'Dodo' : 'Vitoria',
          descricao: dados.descricao,
          valor_formatado: `R$ ${valorFinal.toFixed(2).replace('.', ',')}`,
          quem: dados.nomeTerceiro || 'Próprio',
          detalhe_tipo: dbTipo === TIPO.FIXA ? 'Conta Fixa' : dados.totalParcelas ? `Parcelado ${dados.parcelaAtual}/${dados.totalParcelas}` : 'Crédito à vista',
        },
      });
    } catch (err) {
      console.error('❌ [INTEGRACAO] Erro ao criar lançamento:', {
        message: err.message,
        stack: err.stack,
        body: req.body,
        usuario_id: req.body.usuario_id,
      });
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // GET /api/v1/integracao/lancamentos — Busca por filtros via API
  // ============================================================================
  router.get('/api/v1/integracao/lancamentos', integracaoLimiter, apiAuth, async (req, res) => {
    try {
      const usuario_id = req.query.usuario_id || req.body?.usuario_id;
      if (!usuario_id) {
        return res.status(400).json({ success: false, error: 'Campo "usuario_id" é obrigatório' });
      }

      const idUsuarioFinal = parseInt(usuario_id, 10);
      if (isNaN(idUsuarioFinal) || idUsuarioFinal <= 0) {
        return res.status(400).json({ success: false, error: 'Campo "usuario_id" deve ser um número válido' });
      }

      const filtros = {};
      if (req.query.descricao) filtros.descricao = req.query.descricao;
      if (req.query.terceiro) filtros.terceiro = req.query.terceiro;
      if (req.query.mes) filtros.mes = parseInt(req.query.mes, 10);
      if (req.query.ano) filtros.ano = parseInt(req.query.ano, 10);

      const lancamentos = await repo.getLancamentosPorFiltro(idUsuarioFinal, filtros);

      return res.status(200).json({
        success: true,
        data: lancamentos,
      });
    } catch (err) {
      console.error('❌ [INTEGRACAO-GET] Erro ao buscar lançamentos:', {
        message: err.message,
        stack: err.stack,
        query: req.query,
      });
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // PUT /api/v1/integracao/lancamentos/:id — Atualização parcial via API
  // ============================================================================
  router.put('/api/v1/integracao/lancamentos/:id', integracaoLimiter, apiAuth, async (req, res) => {
    try {
      const { usuario_id } = req.body;
      if (!usuario_id) {
        return res.status(400).json({ success: false, error: 'Campo "usuario_id" é obrigatório' });
      }

      const idUsuarioFinal = parseInt(usuario_id, 10);
      if (isNaN(idUsuarioFinal) || idUsuarioFinal <= 0) {
        return res.status(400).json({ success: false, error: 'Campo "usuario_id" deve ser um número válido' });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'ID do lançamento inválido' });
      }

      const existente = await repo.getLancamento(idUsuarioFinal, id);
      if (!existente) {
        return res.status(404).json({ success: false, error: 'Lançamento não encontrado' });
      }

      // Merge parcial: só sobrescreve campos presentes no body
      const tipoNormPut = req.body.tipo !== undefined ? normalizarTipoIntegracao(req.body.tipo) : null;
      const isParceladaPut = tipoNormPut === 'parcelada' || tipoNormPut === 'parcelado';
      const dadosMerged = {
        descricao: req.body.descricao !== undefined ? req.body.descricao : existente.descricao,
        valor: req.body.valor !== undefined ? parseValor(req.body.valor) : existente.valor,
        tipo: req.body.tipo !== undefined
          ? (tipoNormPut === 'fixa' ? TIPO.FIXA : (isParceladaPut ? TIPO.PARCELADO : TIPO.CARTAO))
          : existente.tipo,
        categoria: req.body.categoria !== undefined ? req.body.categoria : existente.categoria,
        nomeTerceiro: req.body.terceiro !== undefined ? normalizarTerceiro(req.body.terceiro) : existente.nometerceiro,
      };

      // Parcelas: só recalcula se tipo for explicitamente enviado como parcelada
      const isParcelada = req.body.tipo !== undefined
        ? isParceladaPut
        : (existente.totalparcelas != null && existente.totalparcelas > 1);

      // Aceita parcelas via campo legado ou novos campos
      let parcelasRawPut = req.body.parcelas !== undefined ? req.body.parcelas : '';
      if (!parcelasRawPut && req.body.total_parcelas) {
        parcelasRawPut = req.body.parcela_atual ? `${req.body.parcela_atual}/${req.body.total_parcelas}` : String(req.body.total_parcelas);
      }

      const parcelasNorm = normalizarParcelasPorTipo({
        isParcelada,
        parcelasRaw: parcelasRawPut,
      });

      if (parcelasNorm.erro) {
        return res.status(400).json({ success: false, error: parcelasNorm.erro });
      }

      dadosMerged.parcelaAtual = parcelasNorm.parcelaAtual !== null ? parcelasNorm.parcelaAtual : existente.parcelaatual;
      dadosMerged.totalParcelas = parcelasNorm.totalParcelas !== null ? parcelasNorm.totalParcelas : existente.totalparcelas;

      await repo.updateLancamento(idUsuarioFinal, id, dadosMerged);

      return res.status(200).json({
        success: true,
        message: 'Lançamento atualizado',
        data: { id, ...dadosMerged },
      });
    } catch (err) {
      console.error('❌ [INTEGRACAO-PUT] Erro ao atualizar lançamento:', {
        message: err.message,
        stack: err.stack,
        body: req.body,
      });
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // DELETE /api/v1/integracao/lancamentos/:id — Remoção via API
  // ============================================================================
  router.delete('/api/v1/integracao/lancamentos/:id', integracaoLimiter, apiAuth, async (req, res) => {
    try {
      const usuario_id = req.body.usuario_id || req.query.usuario_id;
      if (!usuario_id) {
        return res.status(400).json({ success: false, error: 'Campo "usuario_id" é obrigatório' });
      }

      const idUsuarioFinal = parseInt(usuario_id, 10);
      if (isNaN(idUsuarioFinal) || idUsuarioFinal <= 0) {
        return res.status(400).json({ success: false, error: 'Campo "usuario_id" deve ser um número válido' });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'ID do lançamento inválido' });
      }

      const existente = await repo.getLancamento(idUsuarioFinal, id);
      if (!existente) {
        return res.status(404).json({ success: false, error: 'Lançamento não encontrado' });
      }

      await repo.deleteLancamento(idUsuarioFinal, id);

      return res.status(200).json({
        success: true,
        message: 'Lançamento removido',
      });
    } catch (err) {
      console.error('❌ [INTEGRACAO-DELETE] Erro ao remover lançamento:', {
        message: err.message,
        stack: err.stack,
        body: req.body,
      });
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Rota de automação: Copia as contas de todos os usuários para o próximo mês.
   * Pode ser disparada por um serviço de cron externo gratuito (ex: cron-job.org).
   * 
   * Segurança: requer Header 'x-api-key' ou query param 'token' igual au API_TOKEN.
   */
  router.post('/api/v1/integracao/copiar-mensal', integracaoLimiter, apiAuth, async (req, res) => {
    console.log('--- [API-AUTO-COPY] Iniciando via Webhook Integrado ---');
    
    try {
      // 1. Contexto de Brasília
      const agora = new Date();
      const dataBrasilia = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
      const mesReferencia = dataBrasilia.getMonth() + 1;
      const anoReferencia = dataBrasilia.getFullYear();

      // 2. Buscar usuários
      const usuarios = await repo.getTodosUsuarios();
      
      const resultados = [];
      for (const user of usuarios) {
        try {
          await repo.copyMonth(user.id, mesReferencia, anoReferencia);
          resultados.push({ nome: user.nome, status: 'sucesso' });
        } catch (err) {
          resultados.push({ nome: user.nome, status: 'erro', error: err.message });
        }
      }

      // 3. Notificação via Telegram (Opcional)
      const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
      const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();

      if (token && chatId) {
        const sucessos = resultados.filter(r => r.status === 'sucesso').length;
        const total = resultados.length;
        
        let msg = `🤖 *Automação de Contas*\n`;
        msg += `Processo de cópia realizado para o mês de *${mesReferencia}/${anoReferencia}*\\.\n\n`;
        msg += `📊 *Resumo:* ${sucessos}/${total} sucessos\\.\n`;
        
        resultados.forEach(r => {
          msg += r.status === 'sucesso' ? `✅ *${r.nome}*: Sucesso\n` : `❌ *${r.nome}*: Erro\n`;
        });

        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: 'MarkdownV2'
          })
        }).catch(err => console.error('[API-AUTO-COPY] Erro ao enviar Telegram:', err.message));
      }

      return res.json({
        success: true,
        context: `${mesReferencia}/${anoReferencia}`,
        resultados
      });

    } catch (err) {
      console.error('[API-AUTO-COPY] Erro crítico:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
