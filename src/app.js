// ==============================================================================
// 🚀 SETUP INICIAL E IMPORTAÇÕES
// ==============================================================================
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

// --- MIDDLEWARE: TRATAMENTO DE JSON QUEBRADO ---
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Erro de Sintaxe JSON:', err.message);
    return res.status(400).json({
      success: false,
      error: 'JSON Malformado',
      details: 'Verifique a sintaxe do JSON enviado.',
    });
  }
  next();
});

// Configuração de Sessão
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'segredo-padrao-dev',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const parseValor = (v) => {
  if (v === undefined || v === null) return NaN;
  if (typeof v === 'number') return v;
  const str = String(v).replace('R$', '').trim();
  const cleanStr = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanStr);
};

// ==============================================================================
// 🔌 INTEGRAÇÃO EXTERNA (API - APP ANDROID)
// ==============================================================================

const apiAuth = (req, res, next) => {
  const tokenRecebido = req.headers['x-api-key'];
  if (tokenRecebido && tokenRecebido === API_TOKEN) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Acesso Negado' });
  }
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

    const dadosParaSalvar = {
      descricao,
      valor: valorFinal,
      tipo: dbTipo,
      status: 'PENDENTE',
      parcelaAtual: pAtual,
      totalParcelas: pTotal,
      nomeTerceiro: terceiro || null,
      dataBase: new Date(),
    };

    await repo.addLancamento(idUsuarioFinal, dadosParaSalvar);

    res.status(201).json({
      success: true,
      message: 'Lançamento Confirmado',
      data: {
        dono: idUsuarioFinal === 1 ? 'Dodo' : idUsuarioFinal === 2 ? 'Vitoria' : 'Outro',
        descricao: dadosParaSalvar.descricao,
        valor_formatado: `R$ ${valorFinal.toFixed(2).replace('.', ',')}`,
        quem: dadosParaSalvar.nomeTerceiro || 'Próprio',
        detalhe_tipo: dbTipo === 'FIXA' ? 'Conta Fixa' : pTotal ? `Parcelado ${pAtual}/${pTotal}` : 'Crédito à vista',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 🌐 SISTEMA WEB (ROTAS PROTEGIDAS)
// ==============================================================================

async function authMiddleware(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

// Detalhes do Cartão por Pessoa
app.get('/api/cartao/:nome', authMiddleware, async (req, res) => {
  try {
    const { nome } = req.params;
    const { month, year } = req.query;
    const lancamentos = await repo.getLancamentosCartaoPorPessoa(req.session.user.id, nome, parseInt(month), parseInt(year), req.session.user.nome);
    res.json(lancamentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detalhes de Rendas
app.get('/api/rendas', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await repo.getDetalhesRendas(req.session.user.id, parseInt(month), parseInt(year));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Backup de Dados
app.get('/api/backup', authMiddleware, async (req, res) => {
  try {
    const data = await repo.getAllDataForBackup(req.session.user.id);
    res.setHeader('Content-disposition', 'attachment; filename=backup_financeiro.json');
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(data, null, 2));
    res.end();
  } catch (e) {
    res.status(500).send('Erro ao gerar backup.');
  }
});

// --- ROTA RESTAURADA: RELATÓRIO DE IMPRESSÃO ---
app.get('/relatorio', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userName = req.session.user.nome;
    const mes = parseInt(req.query.month);
    const ano = parseInt(req.query.year);

    const [totais, fixas, cartao, resumoPessoas, dadosTerceirosRaw] = await Promise.all([repo.getDashboardTotals(userId, mes, ano), repo.getLancamentosPorTipo(userId, 'FIXA', mes, ano), repo.getLancamentosPorTipo(userId, 'CARTAO', mes, ano), repo.getResumoPessoas(userId, mes, ano, userName), repo.getDadosTerceiros(userId, mes, ano)]);

    res.render('relatorio', {
      totais,
      fixas,
      cartao,
      resumoPessoas,
      terceiros: dadosTerceirosRaw,
      mes,
      ano,
      user: req.session.user,
    });
  } catch (err) {
    console.error('Erro Relatório:', err);
    res.status(500).send('Erro ao carregar relatório.');
  }
});

app.get('/login', (req, res) => res.render('login', { error: null }));

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
  res.render('login', { error: 'Senha incorreta!' });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/switch/:id', authMiddleware, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const user = await repo.getUsuarioById(targetId);
    if (user) {
      req.session.user = { id: user.id, nome: user.nome, login: user.login };
    }
    res.redirect('/');
  } catch (err) {
    res.redirect('/');
  }
});

app.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userName = req.session.user.nome;
    const hoje = new Date();
    const mes = req.query.month ? parseInt(req.query.month) : hoje.getMonth() + 1;
    const ano = req.query.year ? parseInt(req.query.year) : hoje.getFullYear();

    const dataAtual = new Date(ano, mes - 1, 1);
    const nav = {
      atual: { month: mes, year: ano, dateObj: dataAtual },
      ant: { month: mes === 1 ? 12 : mes - 1, year: mes === 1 ? ano - 1 : ano },
      prox: { month: mes === 12 ? 1 : mes + 1, year: mes === 12 ? ano + 1 : ano },
    };

    const [totais, fixas, cartao, anotacoes, resumoPessoas, dadosTerceirosRaw, ordemCardsRaw, faturaManualVal] = await Promise.all([repo.getDashboardTotals(userId, mes, ano), repo.getLancamentosPorTipo(userId, 'FIXA', mes, ano), repo.getLancamentosPorTipo(userId, 'CARTAO', mes, ano), repo.getAnotacoes(userId), repo.getResumoPessoas(userId, mes, ano, userName), repo.getDadosTerceiros(userId, mes, ano), repo.getOrdemCards(userId), repo.getFaturaManual(userId, mes, ano)]);

    const terceirosMap = {};
    dadosTerceirosRaw.forEach((item) => {
      const nome = item.nometerceiro;
      if (!terceirosMap[nome]) {
        terceirosMap[nome] = { nome: nome, totalCartao: 0, itensCartao: [], itensFixas: [], totalFixas: 0, totalGeral: 0 };
      }
      if (item.status === 'PENDENTE') {
        const val = Number(item.valor);
        terceirosMap[nome].totalGeral += val;
        if (item.tipo === 'CARTAO') terceirosMap[nome].totalCartao += val;
        else if (item.tipo === 'FIXA') terceirosMap[nome].totalFixas += val;
      }
      if (item.tipo === 'FIXA') terceirosMap[nome].itensFixas.push(item);
      else if (item.tipo === 'CARTAO') terceirosMap[nome].itensCartao.push(item);
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

    res.render('index', {
      totais,
      fixas,
      cartao,
      anotacoes,
      resumoPessoas,
      nav,
      terceiros: listaTerceiros,
      query: req.query,
      user: req.session.user,
      faturaManual: faturaManualVal,
    });
  } catch (err) {
    console.error('Erro Dashboard:', err);
    res.status(500).send('Erro ao carregar dashboard.');
  }
});

// APIs Auxiliares e CRUD
app.get('/api/lancamentos/recentes', authMiddleware, async (req, res) => {
  try {
    res.json(await repo.getUltimosLancamentos(req.session.user.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/anotacoes', authMiddleware, async (req, res) => {
  try {
    await repo.updateAnotacoes(req.session.user.id, req.body.conteudo);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/fatura-manual', authMiddleware, async (req, res) => {
  try {
    await repo.saveFaturaManual(req.session.user.id, parseInt(req.body.month), parseInt(req.body.year), parseValor(req.body.valor));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/cards/reorder', authMiddleware, async (req, res) => {
  try {
    await repo.saveOrdemCards(req.session.user.id, req.body.nomes);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lancamentos/copiar', authMiddleware, async (req, res) => {
  try {
    await repo.copyMonth(req.session.user.id, parseInt(req.body.month), parseInt(req.body.year));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/lancamentos/mes', authMiddleware, async (req, res) => {
  try {
    await repo.deleteMonth(req.session.user.id, parseInt(req.query.month), parseInt(req.query.year));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/lancamentos/pessoa/:nome', authMiddleware, async (req, res) => {
  try {
    const { nome } = req.params;
    const { month, year } = req.query;
    await repo.deleteLancamentosPorPessoa(req.session.user.id, nome, parseInt(month), parseInt(year), req.session.user.nome);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lancamentos/status-pessoa', authMiddleware, async (req, res) => {
  try {
    await repo.updateStatusBatchPessoa(req.session.user.id, req.body.pessoa, req.body.status, req.body.month, req.body.year, req.session.user.nome);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lancamentos/reorder', authMiddleware, async (req, res) => {
  try {
    await repo.reorderLancamentos(req.session.user.id, req.body.itens);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lancamentos', authMiddleware, async (req, res) => {
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
    let dataBase = new Date();
    if (context_month && context_year) dataBase = new Date(parseInt(context_year), parseInt(context_month) - 1, 10);
    await repo.addLancamento(req.session.user.id, { descricao: (descricao || '').trim(), valor: parseValor(valor), tipo: dbTipo, categoria: dbCategoria, status: dbStatus, parcelaAtual: pAtual, totalParcelas: pTotal, nomeTerceiro: nome_terceiro || null, dataBase });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lancamentos/:id', authMiddleware, async (req, res) => {
  try {
    const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro } = req.body;
    let pAtual = null,
      pTotal = null;
    if (sub_tipo === 'Parcelada' && parcelas) {
      const parts = parcelas.split('/');
      pAtual = parseInt(parts[0]);
      pTotal = parseInt(parts[1]);
    }
    let dbTipo = sub_tipo === 'Fixa' ? 'FIXA' : 'CARTAO';
    if (tipo_transacao === 'RENDA') dbTipo = 'RENDA';
    await repo.updateLancamento(req.session.user.id, req.params.id, { descricao, valor: parseValor(valor), tipo: dbTipo, categoria: sub_tipo, parcelaAtual: pAtual, totalParcelas: pTotal, nomeTerceiro: nome_terceiro || null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lancamentos/:id', authMiddleware, async (req, res) => {
  try {
    await repo.deleteLancamento(req.session.user.id, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/lancamentos/:id/status', authMiddleware, async (req, res) => {
  try {
    await repo.updateStatus(req.session.user.id, req.params.id, req.body.status);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
