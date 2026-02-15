// CARREGA VARIÁVEIS DE AMBIENTE
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const repo = require('./repositories/FinanceiroRepository');

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIGURAÇÕES DE SEGURANÇA
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

const parseValor = (v) => {
  if (!v) return 0.0;
  const str = String(v);
  return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0.0;
};

// ==============================================================================
// 🔌 INTEGRAÇÃO EXTERNA (API)
// ==============================================================================

// Middleware de Segurança para API (Verifica o Token)
const apiAuth = (req, res, next) => {
  const tokenRecebido = req.headers['x-api-key'];

  if (tokenRecebido && tokenRecebido === API_TOKEN) {
    next(); // Token válido, pode passar
  } else {
    // Delay artificial para evitar ataques de força bruta
    setTimeout(() => {
      res.status(401).json({
        success: false,
        error: 'Acesso negado: API Key inválida ou ausente.',
      });
    }, 500);
  }
};

// ROTA: Cadastrar Lançamento via Externa (Postman/Atalhos)
app.post('/api/v1/integracao/lancamentos', apiAuth, async (req, res) => {
  try {
    // 1. Recebe os dados do JSON
    const { descricao, valor, tipo, parcelas, terceiro, data_vencimento } = req.body;

    // 2. Validação Básica
    if (!descricao || !valor) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: descricao, valor' });
    }

    // 3. Processamento de Dados
    let pAtual = null,
      pTotal = null;
    let dbCategoria = null;
    let dbTipo = 'CARTAO'; // Padrão é cartão

    // Trata Tipo (Fixa ou Cartão)
    if (tipo && tipo.toLowerCase() === 'fixa') {
      dbTipo = 'FIXA';
      dbCategoria = 'Fixa';
    }

    // Trata Parcelas (Ex: "01/10")
    if (parcelas && parcelas.includes('/')) {
      const parts = parcelas.split('/');
      if (parts.length === 2) {
        pAtual = parseInt(parts[0]);
        pTotal = parseInt(parts[1]);
      }
    }

    // Trata Valor (aceita número ou string "100.50")
    const valorFinal = typeof valor === 'string' ? parseFloat(valor) : valor;

    // Trata Data (Opcional, padrão hoje)
    let dataBase = new Date();
    if (data_vencimento) {
      dataBase = new Date(data_vencimento); // Formato YYYY-MM-DD
    }

    // 4. Monta objeto para o repositório
    const dadosParaSalvar = {
      descricao: descricao,
      valor: valorFinal,
      tipo: dbTipo,
      categoria: dbCategoria,
      parcelaAtual: pAtual,
      totalParcelas: pTotal,
      nomeTerceiro: terceiro || null,
      dataBase: dataBase,
      status: 'PENDENTE',
    };

    // 5. Salva no Banco (ID 1 = Dodo como padrão)
    await repo.addLancamento(1, dadosParaSalvar);

    console.log(`[API] Nova conta criada: ${descricao} - R$ ${valorFinal}`);

    res.status(201).json({
      success: true,
      message: 'Lançamento criado com sucesso via API!',
      data: dadosParaSalvar,
    });
  } catch (err) {
    console.error('Erro API:', err);
    res.status(500).json({ success: false, error: 'Erro interno no servidor: ' + err.message });
  }
});

// ==============================================================================
// 🌐 SISTEMA WEB (Middlewares e Rotas de Navegador)
// ==============================================================================

// Middleware de Login (Web)
async function authMiddleware(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// --- ROTAS PÚBLICAS ---
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
      return res.render('login', { error: 'Usuário principal não encontrado.' });
    } catch (err) {
      console.error('Erro Login:', err);
      return res.render('login', { error: 'Erro de conexão com o banco.' });
    }
  } else {
    setTimeout(() => {
      res.render('login', { error: 'Senha incorreta!' });
    }, 500);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Aplica proteção nas rotas abaixo (exceto as de API que já tratamos antes)
app.use(authMiddleware);

// --- ROTAS PROTEGIDAS (WEB) ---

app.get('/switch/:id', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const user = await repo.getUsuarioById(targetId);
    if (user) {
      req.session.user = { id: user.id, nome: user.nome, login: user.login };
      req.session.authenticated = true;
    }
    res.redirect('/');
  } catch (err) {
    res.redirect('/');
  }
});

app.get('/relatorio', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userName = req.session.user.nome;
    const hoje = new Date();
    const mes = req.query.month ? parseInt(req.query.month) : hoje.getMonth() + 1;
    const ano = req.query.year ? parseInt(req.query.year) : hoje.getFullYear();

    const itens = await repo.getRelatorioMensal(userId, mes, ano);

    const agrupado = {};
    agrupado[userName] = { itens: [], total: 0 };

    itens.forEach((item) => {
      const pessoa = item.nometerceiro || userName;
      if (!agrupado[pessoa]) agrupado[pessoa] = { itens: [], total: 0 };
      agrupado[pessoa].itens.push(item);
      agrupado[pessoa].total += Number(item.valor);
    });

    const dataRef = new Date(ano, mes - 1, 1);
    let nomeMes = dataRef.toLocaleString('pt-BR', { month: 'long' });
    nomeMes = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    res.render('relatorio', {
      dados: agrupado,
      mes: nomeMes,
      ano: ano,
      titulo: `Relatório - ${nomeMes} ${ano}`,
      totalGeral: itens.reduce((acc, i) => acc + Number(i.valor), 0),
    });
  } catch (err) {
    console.error('Erro Relatório:', err);
    res.status(500).send('Erro ao gerar relatório.');
  }
});

app.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userName = req.session.user.nome;

    const hoje = new Date();
    let mes = req.query.month ? parseInt(req.query.month) : hoje.getMonth() + 1;
    let ano = req.query.year ? parseInt(req.query.year) : hoje.getFullYear();

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
    if (ordemCardsRaw && ordemCardsRaw.length > 0)
      ordemCardsRaw.forEach((o) => {
        ordemMap[o.nome] = o.ordem;
      });

    const listaTerceiros = Object.values(terceirosMap).sort((a, b) => {
      const ordA = ordemMap[a.nome] !== undefined ? ordemMap[a.nome] : 9999;
      const ordB = ordemMap[b.nome] !== undefined ? ordemMap[b.nome] : 9999;
      if (ordA !== ordB) return ordA - ordB;
      return a.nome.localeCompare(b.nome);
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

// --- APIs INTERNAS (Web - Ajax) ---
app.get('/api/lancamentos/recentes', async (req, res) => {
  try {
    const ultimos = await repo.getUltimosLancamentos(req.session.user.id);
    res.json(ultimos);
  } catch (err) {
    console.error('Erro ultimos:', err);
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
    const rendas = await repo.getDetalhesRendas(req.session.user.id, m, y);
    res.json(rendas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/cartao/:pessoa', async (req, res) => {
  try {
    const m = req.query.month || new Date().getMonth() + 1;
    const y = req.query.year || new Date().getFullYear();
    const itens = await repo.getLancamentosCartaoPorPessoa(req.session.user.id, req.params.pessoa, m, y, req.session.user.nome);
    res.json(itens);
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
    console.error('Erro no backup:', err);
    res.status(500).send('Erro ao gerar backup');
  }
});
app.post('/api/fatura-manual', async (req, res) => {
  try {
    const { valor, month, year } = req.body;
    await repo.saveFaturaManual(req.session.user.id, parseInt(month), parseInt(year), parseValor(valor));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/cards/reorder', async (req, res) => {
  try {
    const { nomes } = req.body;
    await repo.saveOrdemCards(req.session.user.id, nomes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/lancamentos/copiar', async (req, res) => {
  try {
    const month = parseInt(req.body.month);
    const year = parseInt(req.body.year);
    await repo.copyMonth(req.session.user.id, month, year);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/lancamentos/mes', async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    if (isNaN(month) || isNaN(year)) return res.status(400).json({ error: 'Inválido' });
    await repo.deleteMonth(req.session.user.id, month, year);
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
    const { itens } = req.body;
    await repo.reorderLancamentos(req.session.user.id, itens);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CRUD UNITÁRIO ---
app.post('/api/lancamentos', async (req, res) => {
  try {
    const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro, context_month, context_year } = req.body;
    let dbTipo = '',
      dbStatus = 'PENDENTE',
      pAtual = null,
      pTotal = null,
      dbCategoria = null;
    if (tipo_transacao === 'RENDA') {
      dbTipo = 'RENDA';
      dbStatus = 'PAGO';
      dbCategoria = sub_tipo;
    } else {
      dbTipo = sub_tipo === 'Fixa' ? 'FIXA' : 'CARTAO';
      if (sub_tipo === 'Parcelada' && parcelas) {
        const p = parcelas.split('/');
        if (p.length === 2) {
          pAtual = parseInt(p[0]);
          pTotal = parseInt(p[1]);
        }
      }
    }
    let dataBase = new Date();
    if (context_month && context_year) dataBase = new Date(parseInt(context_year), parseInt(context_month) - 1, 10);
    await repo.addLancamento(req.session.user.id, { descricao: (descricao || '').trim(), valor: parseValor(valor), tipo: dbTipo, categoria: dbCategoria, status: dbStatus, parcelaAtual: pAtual, totalParcelas: pTotal, nomeTerceiro: nome_terceiro || null, dataBase: dataBase });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lancamentos/:id', async (req, res) => {
  try {
    const { descricao, valor, tipo_transacao, sub_tipo, parcelas, nome_terceiro } = req.body;
    let pAtual = null,
      pTotal = null;
    if (sub_tipo === 'Parcelada' && parcelas) {
      const parts = parcelas.split('/');
      if (parts.length === 2) {
        pAtual = parseInt(parts[0]);
        pTotal = parseInt(parts[1]);
      }
    }
    let dbTipo = 'CARTAO',
      dbCategoria = null;
    if (tipo_transacao === 'RENDA') {
      dbTipo = 'RENDA';
      dbCategoria = sub_tipo;
    } else if (sub_tipo === 'Fixa') dbTipo = 'FIXA';
    else dbTipo = 'CARTAO';
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

app.listen(PORT, () => console.log(`🚀 Servidor rodando`));
