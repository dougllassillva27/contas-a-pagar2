// ==============================================================================
// 🔌 INTEGRAÇÃO ANDROID (API)
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

const express = require('express');
const router = express.Router();
const { parseValor, normalizarTipoIntegracao, normalizarParcelasPorTipo } = require('../helpers/parseHelpers');
const { STATUS, TIPO } = require('../constants');

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
  router.post('/api/v1/integracao/lancamentos', apiAuth, async (req, res) => {
    try {
      const { descricao, valor, tipo, parcelas, terceiro, usuario_id } = req.body;

      const idUsuarioFinal = parseInt(usuario_id, 10);
      const valorFinal = parseValor(valor);

      // Decide tipo no banco (regra atual):
      // - "fixa" => FIXA
      // - qualquer outro => CARTAO
      const tipoNorm = normalizarTipoIntegracao(tipo);
      const isFixa = tipoNorm === 'fixa';
      const isParcelada = tipoNorm === 'parcelada';
      const dbTipo = isFixa ? TIPO.FIXA : TIPO.CARTAO;

      const parcelasNorm = normalizarParcelasPorTipo({
        isParcelada,
        parcelasRaw: parcelas,
      });

      // Se foi parcelada mas veio inválido, retorna 400 com mensagem clara
      if (parcelasNorm.erro) {
        return res.status(400).json({ success: false, error: parcelasNorm.erro });
      }

      const dados = {
        descricao,
        valor: valorFinal,
        tipo: dbTipo,
        status: STATUS.PENDENTE,
        parcelaAtual: parcelasNorm.parcelaAtual,
        totalParcelas: parcelasNorm.totalParcelas,
        nomeTerceiro: terceiro || null,
        dataBase: new Date(),
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
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Rota de automação: Copia as contas de todos os usuários para o próximo mês.
   * Pode ser disparada por um serviço de cron externo gratuito (ex: cron-job.org).
   * 
   * Segurança: requer Header 'x-api-key' ou query param 'token' igual au API_TOKEN.
   */
  router.post('/api/v1/integracao/copiar-mensal', apiAuth, async (req, res) => {
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
