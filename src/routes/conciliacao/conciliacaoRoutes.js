// ==============================================================================
// conciliacaoRoutes — confronto fatura do banco (Pluggy) x lançamentos do app
// ==============================================================================
// GET  /api/conciliacao/cartao      → diff do mês (usa cache da última sync)
// POST /api/conciliacao/sincronizar → busca na Pluggy e atualiza o cache
// GET  /api/recorrencias            → lista recorrências do cartão
// POST /api/recorrencias            → cria
// PATCH /api/recorrencias/:id       → atualiza (inclusive ativar/desativar)
//
// Não importa transação nenhuma para Lancamentos: a Pluggy é fonte de leitura, os
// lançamentos continuam manuais. O único caminho de escrita em lançamento é o
// botão "confirmar casados", que reusa /api/lancamentos/conferido-extrato-lote.
// ==============================================================================

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../helpers/asyncHandler');
const pluggy = require('../../services/pluggyService');
const { conciliar } = require('../../services/conciliacaoService');

const TTL_CACHE_MS = 15 * 60 * 1000; // 15 min: evita bater na API a cada F5
const DIAS_JANELA = 45; // busca transações cobrindo o ciclo atual

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function deslocar(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Transações da fatura aberta = as ainda não faturadas (PENDING), mais as já
// postadas que ainda não entraram em nenhuma fatura fechada.
// Descarta as projeções do conector: parcela futura projetada vem com
// billForecastDate "0001-01" e billPostDate null, e não é cobrança do ciclo
// (caso real: empréstimo JIM aparecia como 1/12 e 7/12 na mesma data).
function ehProjecao(t) {
  const meta = t?.creditCardMetadata || {};
  const previsao = String(meta.billForecastDate || '');
  return !meta.billPostDate && (!previsao || previsao.startsWith('0001'));
}

function transacoesDaFaturaAberta(transacoes) {
  return transacoes.filter((t) => {
    if (!t || ehProjecao(t)) return false;
    if (t.status === 'PENDING') return true;
    return Boolean(t.creditCardMetadata && !t.creditCardMetadata.billId);
  });
}

// Data do banco/do app em ISO (YYYY-MM-DD) ou Date -> dd/MM/yyyy para a tela
function formatarData(valor) {
  if (!valor) return null;
  const iso = String(valor).slice(0, 10);
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia && dia.length === 2 ? `${dia}/${mes}/${ano}` : iso;
}

function apresentarLancamento(l) {
  return {
    id: l.id != null ? l.id : null,
    descricao: l.descricao || l.description || '',
    valor: Number(l.valor != null ? l.valor : l.amount) || 0,
    dono: l.dono || l.nometerceiro || null,
    origem: 'app',
    venc: formatarData(l.venc || l.datavencimento),
    parcela: l.parcelaatual ? `${l.parcelaatual}/${l.totalparcelas}` : null,
  };
}

function apresentarTransacao(t) {
  return {
    descricao: t.description || '',
    valor: Number(t.amount) || 0,
    data: formatarData(t.date),
    status: t.status || null,
    origem: 'banco',
    // crédito/estorno não traz dono do banco: vem inferido do lançamento do
    // mesmo estabelecimento (null quando há mais de um dono possível)
    dono: t._donoSugerido || null,
    donoInferido: Boolean(t._donoInferido),
    parcela: t.creditCardMetadata?.installmentNumber
      ? `${t.creditCardMetadata.installmentNumber}/${t.creditCardMetadata.totalInstallments || '?'}`
      : null,
  };
}

function montarResposta(diff, meta) {
  return {
    configurado: meta.configurado,
    cartao: meta.cartao,
    fatura: meta.fatura,
    atualizadoEm: meta.atualizadoEm,
    totais: {
      banco: diff.banco,
      app: diff.app,
      casamento: diff.casamento,
      esperadoNoApp: diff.esperadoNoApp,
      diferenca: diff.diferenca,
      residual: diff.residual,
      conciliado: diff.conciliado,
    },
    resumo: {
      casados: diff.casados.length,
      rateios: diff.rateios.length,
      divergentes: diff.divergentes.length,
      faltando: diff.faltandoApp.length,
      previstos: diff.previstos.length,
      sobrando: diff.sobrandoApp.length,
      estornos: diff.estornosApp.length,
      creditos: diff.creditosBanco.length,
    },
    casados: diff.casados.map((c) => ({ ...apresentarTransacao(c.banco), app: apresentarLancamento(c.app), motivo: c.motivo })),
    rateios: diff.rateios.map((r) => ({
      ...apresentarTransacao(r.banco),
      motivo: r.motivo,
      confianca: r.confianca || 'alta',
      partes: r.apps.map(apresentarLancamento),
    })),
    divergentes: diff.divergentes.map((d) => ({
      ...apresentarTransacao(d.banco),
      app: apresentarLancamento(d.app),
      diferenca: d.diferenca,
    })),
    faltando: diff.faltandoApp.map(apresentarTransacao),
    creditos: diff.creditosBanco.map(apresentarTransacao),
    previstos: diff.previstos.map((p) => ({
      ...apresentarLancamento(p.app),
      situacao: p.situacao,
      recorrencia: p.recorrencia ? { id: p.recorrencia.id, descricao: p.recorrencia.descricao, dia: p.recorrencia.diaCobranca } : null,
    })),
    sobrando: diff.sobrandoApp.map(apresentarLancamento),
    estornos: diff.estornosApp.map(apresentarLancamento),
  };
}

async function sincronizar(userId, repo) {
  const cfg = pluggy.config();
  if (!pluggy.estaConfigurado()) {
    return { erro: 'PLUGGY_* não configurado no .env', configurado: false };
  }

  const conta = await pluggy.contaCartao();
  if (!conta) return { erro: 'Nenhuma conta de cartão encontrada no item Pluggy', configurado: true };

  const faturas = await pluggy.listarFaturas(conta.id);
  const hoje = hojeISO();
  const transacoes = await pluggy.listarTransacoes({ accountId: conta.id, de: deslocar(hoje, -DIAS_JANELA), ate: deslocar(hoje, 1) });

  // Fatura aberta: a próxima a vencer. As transações PENDING são as que a compõem.
  // Pagamento de fatura não é compra: fora do total (senão a fatura "aberta" dá negativo).
  const ehPagamentoFatura = (t) => /pagamento\s*(de\s*)?fatura|pagto\s*fatura/i.test(t.description || '');
  const proxima = faturas.find((f) => f.vencimento && f.vencimento >= hoje) || null;
  const abertas = transacoesDaFaturaAberta(transacoes).filter((t) => !ehPagamentoFatura(t));
  const totalAberto = abertas.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const dados = {
    itemId: cfg.itemId,
    accountId: conta.id,
    cartaoLabel: conta.name ? `${conta.name}${conta.number ? ' final ' + conta.number : ''}` : cfg.label,
    faturaId: proxima?.id || null,
    faturaTotal: Number(totalAberto.toFixed(2)),
    faturaVencimento: proxima?.vencimento || null,
    dataFechamento: conta.fechamento || proxima?.fecha || null,
    // Só as transações que compõem a fatura aberta: guardar a lista inteira fazia
    // o diff comparar 4 meses de compras com um mês de lançamentos.
    transacoes: abertas,
  };

  await repo.salvarPluggySync(userId, dados);
  return { ok: true, configurado: true, ...dados, transacoes: undefined };
}

module.exports = function (repo) {
  // --- Diff do mês -----------------------------------------------------------
  router.get(
    '/api/conciliacao/cartao',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const mes = Number(req.query.month) || new Date().getMonth() + 1;
      const ano = Number(req.query.year) || new Date().getFullYear();

      if (!pluggy.estaConfigurado()) {
        return res.json({ configurado: false, motivo: 'PLUGGY_* não configurado no .env' });
      }

      let sync = await repo.getPluggySync(userId);
      const velho = !sync || !sync.atualizadoEm || Date.now() - new Date(sync.atualizadoEm).getTime() > TTL_CACHE_MS;

      if (velho) {
        try {
          await sincronizar(userId, repo);
          sync = await repo.getPluggySync(userId);
        } catch (err) {
          // Sem rede/credencial vencida: devolve o cache antigo com aviso, não quebra a tela
          if (!sync) {
            return res.status(200).json({ configurado: true, erro: err.message, totais: null });
          }
          res.locals.avisoSync = err.message;
        }
      }

      const lancamentos = await repo.getLancamentosCartaoMes(userId, mes, ano);
      // Inclui as inativas: o motor precisa saber que a recorrência foi desligada
      // para não tratar o lançamento órfão como "ainda vai cobrar".
      const recorrencias = await repo.listarRecorrencias(userId, { somenteAtivas: false });

      const diff = conciliar({
        // Filtra de novo na leitura: cache antigo pode ter sido gravado com as
        // projeções de parcela que o conector devolve (billForecastDate 0001-01).
        transacoes: (sync.transacoes || []).filter((t) => !ehProjecao(t)),
        lancamentos,
        recorrencias,
        hoje: hojeISO(),
      });

      const resposta = montarResposta(diff, {
        configurado: true,
        cartao: { label: sync.cartaoLabel, accountId: sync.accountId },
        fatura: { id: sync.faturaId, total: sync.faturaTotal, vencimento: sync.faturaVencimento, fechamento: sync.dataFechamento },
        atualizadoEm: sync.atualizadoEm,
      });
      if (res.locals.avisoSync) resposta.aviso = res.locals.avisoSync;
      return res.json(resposta);
    })
  );

  // --- Sincronização manual --------------------------------------------------
  router.post(
    '/api/conciliacao/sincronizar',
    asyncHandler(async (req, res) => {
      const userId = req.session.user.id;
      const resultado = await sincronizar(userId, repo);
      if (resultado.erro) return res.status(400).json({ success: false, error: resultado.erro });
      return res.json({ success: true, fatura: resultado.faturaTotal, vencimento: resultado.faturaVencimento, cartao: resultado.cartaoLabel });
    })
  );

  // --- Recorrências ----------------------------------------------------------
  router.get(
    '/api/recorrencias',
    asyncHandler(async (req, res) => {
      const lista = await repo.listarRecorrencias(req.session.user.id, { somenteAtivas: req.query.todas !== '1' });
      res.json({ success: true, recorrencias: lista });
    })
  );

  router.post(
    '/api/recorrencias',
    asyncHandler(async (req, res) => {
      const { descricao, valorTotal, diaCobranca, participantes, cartaoLabel } = req.body || {};
      if (!descricao || !String(descricao).trim()) {
        return res.status(400).json({ success: false, error: 'descricao é obrigatória' });
      }
      if (!(Number(valorTotal) > 0)) {
        return res.status(400).json({ success: false, error: 'valorTotal deve ser maior que zero' });
      }
      if (diaCobranca != null && (Number(diaCobranca) < 1 || Number(diaCobranca) > 31)) {
        return res.status(400).json({ success: false, error: 'diaCobranca deve estar entre 1 e 31' });
      }
      const criada = await repo.criarRecorrencia(req.session.user.id, {
        descricao,
        valorTotal,
        diaCobranca,
        cartaoLabel,
        participantes,
      });
      res.status(201).json({ success: true, recorrencia: criada });
    })
  );

  // Gera os lançamentos do mês a partir das recorrências ativas (idempotente)
  router.post(
    '/api/recorrencias/gerar',
    asyncHandler(async (req, res) => {
      const agora = new Date();
      const mes = Number(req.body?.month) || agora.getMonth() + 1;
      const ano = Number(req.body?.year) || agora.getFullYear();
      if (mes < 1 || mes > 12) return res.status(400).json({ success: false, error: 'mês inválido' });
      if (ano < 2000 || ano > 2100) return res.status(400).json({ success: false, error: 'ano inválido' });

      const resultado = await repo.gerarLancamentosDoMes(req.session.user.id, mes, ano);
      res.json({
        success: true,
        mes,
        ano,
        criados: resultado.criados.length,
        vinculados: resultado.vinculados.length,
        pulados: resultado.pulados.length,
        detalhe: resultado,
      });
    })
  );

  router.patch(
    '/api/recorrencias/:id',
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'id inválido' });
      }
      const { descricao, valorTotal, diaCobranca, participantes, ativo } = req.body || {};
      const atualizada = await repo.atualizarRecorrencia(req.session.user.id, id, {
        descricao,
        valorTotal,
        diaCobranca,
        participantes,
        ativo,
      });
      if (!atualizada) return res.status(404).json({ success: false, error: 'recorrência não encontrada' });
      res.json({ success: true, recorrencia: atualizada });
    })
  );

  return router;
};
