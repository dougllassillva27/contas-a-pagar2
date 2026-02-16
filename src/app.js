// CARREGA VARIÁVEIS DE AMBIENTE
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const repo = require('./repositories/FinanceiroRepository');

const app = express();
const PORT = process.env.PORT || 3000;

const SENHA_MESTRA = (process.env.SENHA_MESTRA || 'senha_padrao_insegura').trim();
const API_TOKEN = (process.env.API_TOKEN || 'token_padrao_inseguro').trim();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'segredo-padrao-dev',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Função auxiliar para tratamento de valores
const parseValor = (v) => {
  if (!v) return 0.0;
  const str = String(v);
  return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0.0;
};

// Middleware de Proteção
async function authMiddleware(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

// ==============================================================================
// 🔌 INTEGRAÇÃO ANDROID (API)
// ==============================================================================

const apiAuth = (req, res, next) => {
  const tokenRecebido = req.headers['x-api-key'];
  if (tokenRecebido && tokenRecebido === API_TOKEN) next();
  else res.status(401).json({ success: false, error: 'Acesso Negado' });
};

app.post('/api/v1/integracao/lancamentos', apiAuth, async (req, res) => {
  try {
    const { descricao, valor, tipo, parcelas, terceiro, usuario_id } = req.body;
    const idUsuarioFinal = parseInt(usuario_id);
    const valorFinal = parseValor(valor);

    let dbTipo = String(tipo || '').toLowerCase() === 'fixa' ? 'FIXA' : 'CARTAO';
    let pAtual = null,
      pTotal = null;
    if (parcelas && String(parcelas).includes('/')) {
      const parts = String(parcelas).split('/');
      pAtual = parseInt(parts[0]);
      pTotal = parseInt(parts[1]);
    }

    const dados = { descricao, valor: valorFinal, tipo: dbTipo, status: 'PENDENTE', parcelaAtual: pAtual, totalParcelas: pTotal, nomeTerceiro: terceiro || null, dataBase: new Date() };
    await repo.addLancamento(idUsuarioFinal, dados);

    res.status(201).json({
      success: true,
      message: 'Lançamento Confirmado',
      data: {
        dono: idUsuarioFinal === 1 ? 'Dodo' : 'Vitoria',
        descricao: dados.descricao,
        valor_formatado: `R$ ${valorFinal.toFixed(2).replace('.', ',')}`,
        quem: dados.nomeTerceiro || 'Próprio',
        detalhe_tipo: dbTipo === 'FIXA' ? 'Conta Fixa' : pTotal ? `Parcelado ${pAtual}/${pTotal}` : 'Crédito à vista',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 🌐 ROTAS PÚBLICAS (LOGIN)
// ==============================================================================

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const passwordDigitada = (req.body.password || '').trim();
  if (passwordDigitada === SENHA_MESTRA) {
    try {
      const user = await repo.getUsuarioById(1);
      if (user) {
        req.session.user = { id: user.id, nome: user.nome, login: user.login };
        return res.redirect('/');
      }
    } catch (err) {
      return res.render('login', { error: 'Erro de conexão.' });
    }
  }
  setTimeout(() => {
    res.render('login', { error: 'Senha incorreta!' });
  }, 500);
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ==============================================================================
// 🛡️ ROTAS PROTEGIDAS (WEB)
// ==============================================================================

app.use(authMiddleware);

app.get('/switch/:id', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const user = await repo.getUsuarioById(targetId);
    if (user) req.session.user = { id: user.id, nome: user.nome, login: user.login };
    res.redirect('/');
  } catch (err) {
    res.redirect('/');
  }
});

// --- RELATÓRIO (CORRIGIDO) ---
app.get('/relatorio', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userName = req.session.user.nome;
    const mes = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const ano = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const dataAtual = new Date(ano, mes - 1, 1);
    const nav = { atual: { month: mes, year: ano, dateObj: dataAtual } }; // Objeto nav restaurado

    const itens = await repo.getRelatorioMensal(userId, mes, ano);
    const agrupado = {};
    agrupado[userName] = { itens: [], total: 0 };

    itens.forEach((item) => {
      const pessoa = item.nometerceiro || userName;
      if (!agrupado[pessoa]) agrupado[pessoa] = { itens: [], total: 0 };
      agrupado[pessoa].itens.push(item);
      agrupado[pessoa].total += Number(item.valor);
    });

    let nomeMes = dataAtual.toLocaleString('pt-BR', { month: 'long' });
    nomeMes = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    res.render('relatorio', {
      dados: agrupado,
      mes: nomeMes,
      ano: ano,
      titulo: `Relatório - ${nomeMes} ${ano}`,
      totalGeral: itens.reduce((acc, i) => acc + Number(i.valor), 0),
      nav: nav, // Passa o nav para o EJS não quebrar
    });
  } catch (err) {
    res.status(500).send('Erro ao gerar relatório.');
  }
});

app.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userName = req.session.user.nome;
    let mes = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    let ano = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const dataAtual = new Date(ano, mes - 1, 1);
    const dataAnterior = new Date(ano, mes - 2, 1);
    const dataProxima = new Date(ano, mes, 1);

    const nav = {
      atual: { month: mes, year: ano, dateObj: dataAtual },
      ant: { month: dataAnterior.getMonth() + 1, year: dataAnterior.getFullYear() },
      prox: { month: dataProxima.getMonth() + 1, year: dataProxima.getFullYear() },
    };

    const [totais, fixas, cartao, anotacoes, resumoPessoas, dadosTerceirosRaw, ordemCardsRaw, faturaManualVal] = await Promise.all([repo.getDashboardTotals(userId, mes, ano), repo.getLancamentosPorTipo(userId, 'FIXA', mes, ano), repo.getLancamentosPorTipo(userId, 'CARTAO', mes, ano), repo.getAnotacoes(userId), repo.getResumoPessoas(userId, mes, ano, userName), repo.getDadosTerceiros(userId, mes, ano), repo.getOrdemCards(userId), repo.getFaturaManual(userId, mes, ano)]);

    const terceirosMap = {};
    dadosTerceirosRaw.forEach((item) => {
      const nome = item.nometerceiro;
      if (!terceirosMap[nome]) terceirosMap[nome] = { nome: nome, totalCartao: 0, itensCartao: [], itensFixas: [], totalFixas: 0, totalGeral: 0 };
      if (item.status === 'PENDENTE') {
        const val = Number(item.valor);
        terceirosMap[nome].totalGeral += val;
        if (item.tipo === 'CARTAO') terceirosMap[nome].totalCartao += val;
        else if (item.tipo === 'FIXA') terceirosMap[nome].totalFixas += val;
      }
      if (item.tipo === 'FIXA') terceirosMap[nome].itensFixas.push(item);
      else terceirosMap[nome].itensCartao.push(item);
    });

    const ordemMap = {};
    if (ordemCardsRaw)
      ordemCardsRaw.forEach((o) => {
        ordemMap[o.nome] = o.ordem;
      });

    const listaTerceiros = Object.values(terceirosMap).sort((a, b) => {
      const ordA = ordemMap[a.nome] ?? 9999;
      const ordB = ordemMap[b.nome] ?? 9999;
      return ordA - ordB || a.nome.localeCompare(b.nome);
    });

    res.render('index', { totais, fixas, cartao, anotacoes, resumoPessoas, nav, terceiros: listaTerceiros, query: req.query, user: req.session.user, faturaManual: faturaManualVal });
  } catch (err) {
    res.status(500).send('Erro ao carregar dashboard.');
  }
});

// --- APIs GERAIS ---

app.get('/api/lancamentos/recentes', async (req, res) => {
  try {
    res.json(await repo.getUltimosLancamentos(req.session.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/anotacoes', async (req, res) => {
  try {
    await repo.updateAnotacoes(req.session.user.id, req.body.conteudo);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rendas', async (req, res) => {
  try {
    const m = req.query.month || new Date().getMonth() + 1;
    const y = req.query.year || new Date().getFullYear();
    res.json(await repo.getDetalhesRendas(req.session.user.id, m, y));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cartao/:pessoa', async (req, res) => {
  try {
    const m = req.query.month || new Date().getMonth() + 1;
    const y = req.query.year || new Date().getFullYear();
    res.json(await repo.getLancamentosCartaoPorPessoa(req.session.user.id, req.params.pessoa, m, y, req.session.user.nome));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup', async (req, res) => {
  try {
    const data = await repo.getAllDataForBackup(req.session.user.id);
    const fileName = `backup_${req.session.user.login}_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).send('Erro no backup');
  }
});

app.post('/api/fatura-manual', async (req, res) => {
  try {
    await repo.saveFaturaManual(req.session.user.id, parseInt(req.body.month), parseInt(req.body.year), parseValor(req.body.valor));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cards/reorder', async (req, res) => {
  try {
    await repo.saveOrdemCards(req.session.user.id, req.body.nomes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lancamentos/copiar', async (req, res) => {
  try {
    await repo.copyMonth(req.session.user.id, parseInt(req.body.month), parseInt(req.body.year));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lancamentos/mes', async (req, res) => {
  try {
    await repo.deleteMonth(req.session.user.id, parseInt(req.query.month), parseInt(req.query.year));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NOVA ROTA: Excluir Lote Pessoa
app.delete('/api/lancamentos/pessoa/:nome', async (req, res) => {
  try {
    await repo.deleteLancamentosPorPessoa(req.session.user.id, req.params.nome, parseInt(req.query.month), parseInt(req.query.year), req.session.user.nome);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lancamentos/status-pessoa', async (req, res) => {
  try {
    await repo.updateStatusBatchPessoa(req.session.user.id, req.body.pessoa, req.body.status, req.body.month, req.body.year, req.session.user.nome);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lancamentos/reorder', async (req, res) => {
  try {
    await repo.reorderLancamentos(req.session.user.id, req.body.itens);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD UNITÁRIO
app.post('/api/lancamentos', async (req, res) => {
  try {
    const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro, context_month, context_year } = req.body;
    let dbTipo = sub_tipo === 'Fixa' ? 'FIXA' : 'CARTAO';
    let dbStatus = 'PENDENTE',
      pAtual = null,
      pTotal = null,
      dbCategoria = null;
    if (tipo_transacao === 'RENDA') {
      dbTipo = 'RENDA';
      dbStatus = 'PAGO';
      dbCategoria = sub_tipo;
    } else if (sub_tipo === 'Parcelada' && parcelas) {
      const p = parcelas.split('/');
      pAtual = parseInt(p[0]);
      pTotal = parseInt(p[1]);
    }

    let dataBase = new Date(context_year, context_month - 1, 10);
    await repo.addLancamento(req.session.user.id, { descricao: (descricao || '').trim(), valor: parseValor(valor), tipo: dbTipo, categoria: dbCategoria, status: dbStatus, parcelaAtual: pAtual, totalParcelas: pTotal, nomeTerceiro: nome_terceiro || null, dataBase });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lancamentos/:id', async (req, res) => {
  try {
    const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro } = req.body;
    let pAtual = null,
      pTotal = null,
      dbTipo = sub_tipo === 'Fixa' ? 'FIXA' : 'CARTAO',
      dbCategoria = null;
    if (tipo_transacao === 'RENDA') {
      dbTipo = 'RENDA';
      dbCategoria = sub_tipo;
    } else if (sub_tipo === 'Parcelada' && parcelas) {
      const p = parcelas.split('/');
      pAtual = parseInt(p[0]);
      pTotal = parseInt(p[1]);
    }
    await repo.updateLancamento(req.session.user.id, req.params.id, { descricao, valor: parseValor(valor), tipo: dbTipo, categoria: dbCategoria, parcelaAtual: pAtual, totalParcelas: pTotal, nomeTerceiro: nome_terceiro || null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lancamentos/:id', async (req, res) => {
  try {
    await repo.deleteLancamento(req.session.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/lancamentos/:id/status', async (req, res) => {
  try {
    await repo.updateStatus(req.session.user.id, req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
