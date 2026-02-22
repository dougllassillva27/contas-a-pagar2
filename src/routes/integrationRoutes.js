// ==============================================================================
// 🔌 INTEGRAÇÃO ANDROID (API)
// Extraído de app.js — sem alteração de lógica
// ==============================================================================

const express = require('express');
const router = express.Router();
const { parseValor, normalizarTipoIntegracao, normalizarParcelasPorTipo } = require('../helpers/parseHelpers');

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
      const dbTipo = isFixa ? 'FIXA' : 'CARTAO';

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
        status: 'PENDENTE',
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
          detalhe_tipo: dbTipo === 'FIXA' ? 'Conta Fixa' : dados.totalParcelas ? `Parcelado ${dados.parcelaAtual}/${dados.totalParcelas}` : 'Crédito à vista',
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
