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

// Configurações de Segurança e Ambiente
const SENHA_MESTRA = (process.env.SENHA_MESTRA || 'senha_padrao_insegura').trim();
const API_TOKEN = (process.env.API_TOKEN || 'token_padrao_inseguro').trim();

// Configuração da View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

// Configuração de Parseamento (JSON e URL Encoded)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- MIDDLEWARE: TRATAMENTO DE JSON QUEBRADO ---
// Evita que o servidor caia se alguém enviar um JSON mal formatado
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Erro de Sintaxe JSON:', err.message);
    return res.status(400).json({
      success: false,
      error: 'JSON Malformado',
      details: 'Verifique a sintaxe do JSON enviado (vírgulas, aspas, chaves).',
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
    cookie: { secure: false }, // Em produção com HTTPS, mude para true
  })
);

// --- FUNÇÃO AUXILIAR: FORMATAR VALORES ---
// Converte "R$ 1.200,50" ou "1200.50" para float JS (1200.50)
const parseValor = (v) => {
  if (v === undefined || v === null) return NaN;
  if (typeof v === 'number') return v;

  // Remove R$ e espaços
  const str = String(v).replace('R$', '').trim();
  if (str === '') return NaN;

  // Remove pontos de milhar e troca vírgula decimal por ponto
  const cleanStr = str.replace(/\./g, '').replace(',', '.');

  return parseFloat(cleanStr);
};

// ==============================================================================
// 🔌 INTEGRAÇÃO EXTERNA (API - APP ANDROID / POSTMAN)
// ==============================================================================

// Middleware de Autenticação da API
const apiAuth = (req, res, next) => {
  const tokenRecebido = req.headers['x-api-key'];
  if (tokenRecebido && tokenRecebido === API_TOKEN) {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: 'Acesso Negado',
      details: 'Token da API inválido ou ausente.',
    });
  }
};

// ROTA: Cadastrar Lançamento (Usada pelo Atalhos HTTP / MacroDroid)
app.post('/api/v1/integracao/lancamentos', apiAuth, async (req, res) => {
  try {
    const { descricao, valor, tipo, parcelas, terceiro, data_vencimento, usuario_id } = req.body;

    // --- 1. VALIDAÇÕES ---

    // Validação Usuário (OBRIGATÓRIO)
    if (!usuario_id) {
      return res.status(400).json({
        success: false,
        error: 'Usuário não informado',
        details: 'O campo "usuario_id" é obrigatório. Envie 1 (Dodo) ou 2 (Vitoria).',
      });
    }

    const idUsuarioFinal = parseInt(usuario_id);
    if (isNaN(idUsuarioFinal) || idUsuarioFinal <= 0) {
      return res.status(400).json({ success: false, error: 'ID Inválido', details: 'Usuário inválido.' });
    }

    // Validação Descrição
    if (!descricao || String(descricao).trim() === '') {
      return res.status(400).json({ success: false, error: 'Descrição vazia', details: 'Informe o que foi comprado.' });
    }

    // Validação Valor
    const valorFinal = parseValor(valor);
    if (isNaN(valorFinal) || valorFinal <= 0) {
      return res.status(400).json({ success: false, error: 'Valor inválido', details: 'O valor deve ser numérico e maior que zero.' });
    }

    // --- 2. PROCESSAMENTO DE DADOS ---
    let dbTipo = 'CARTAO';
    let dbCategoria = null;
    let pAtual = null,
      pTotal = null;
    const tipoNorm = String(tipo || '').toLowerCase();

    // Lógica de Tipos (Fixa, Parcelada, Única)
    if (tipoNorm === 'fixa') {
      dbTipo = 'FIXA';
      dbCategoria = 'Fixa';
    } else {
      dbTipo = 'CARTAO';
      // Tenta extrair parcelas se vier no formato "1/10"
      if (tipoNorm === 'parcelada' && parcelas && String(parcelas).includes('/')) {
        const parts = String(parcelas).split('/');
        if (parts.length === 2) {
          pAtual = parseInt(parts[0]);
          pTotal = parseInt(parts[1]);
        }
      }
    }

    // Data de Vencimento (Opcional, default: Hoje)
    let dataBase = new Date();
    if (data_vencimento) {
      const d = new Date(data_vencimento);
      if (!isNaN(d.getTime())) dataBase = d;
    }

    // --- 3. SALVAR NO BANCO ---
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

    await repo.addLancamento(idUsuarioFinal, dadosParaSalvar);

    console.log(`[API] Nova conta (User ${idUsuarioFinal}): ${descricao} - R$ ${valorFinal.toFixed(2)}`);

    // --- 4. RESPOSTA FORMATADA (PARA O SCRIPT DO ANDROID) ---
    // Aqui garantimos que o JSON tem os campos "bonitos" para o recibo
    res.status(201).json({
      success: true,
      message: 'Lançamento Confirmado',
      data: {
        dono: idUsuarioFinal === 1 ? 'Dodo' : idUsuarioFinal === 2 ? 'Vitoria' : 'Outro',
        descricao: dadosParaSalvar.descricao,
        // Formata R$ 1.250,00 (Brasil)
        valor_formatado: `R$ ${valorFinal.toFixed(2).replace('.', ',')}`,
        quem: dadosParaSalvar.nomeTerceiro || 'Próprio',
        // Texto descritivo do tipo
        detalhe_tipo: dbTipo === 'FIXA' ? 'Conta Fixa' : pTotal ? `Parcelado ${pAtual}/${pTotal}` : 'Crédito à vista',
      },
    });
  } catch (err) {
    console.error('Erro Crítico API:', err);
    res.status(500).json({ success: false, error: 'Erro no Servidor', details: err.message });
  }
});

// ==============================================================================
// 🌐 SISTEMA WEB (DASHBOARD E TELAS)
// ==============================================================================

// Middleware de Login
async function authMiddleware(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

// Rota de Login (GET)
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

// Rota de Login (POST)
app.post('/login', async (req, res) => {
  const passwordDigitada = (req.body.password || '').trim();
  if (passwordDigitada === SENHA_MESTRA) {
    try {
      // Loga sempre como ID 1 (Dodo) inicialmente
      const user = await repo.getUsuarioById(1);
      if (user) {
        req.session.user = { id: user.id, nome: user.nome, login: user.login };
        return res.redirect('/');
      }
      return res.render('login', { error: 'Usuário principal não encontrado no banco.' });
    } catch (err) {
      console.error(err);
      return res.render('login', { error: 'Erro de conexão com o banco de dados.' });
    }
  } else {
    // Delay artificial para evitar Brute Force
    setTimeout(() => {
      res.render('login', { error: 'Senha incorreta!' });
    }, 500);
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// --- APLICA PROTEÇÃO NAS ROTAS ABAIXO ---
app.use(authMiddleware);

// Trocar de Usuário (Dodo <-> Vitoria)
app.get('/switch/:id', async (req, res) => {
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

// Dashboard Principal
app.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userName = req.session.user.nome;
    const hoje = new Date();

    // Filtros de Mês/Ano
    const mes = req.query.month ? parseInt(req.query.month) : hoje.getMonth() + 1;
    const ano = req.query.year ? parseInt(req.query.year) : hoje.getFullYear();

    // Navegação (Mês Anterior / Próximo)
    const dataAtual = new Date(ano, mes - 1, 1);
    const nav = {
      atual: { month: mes, year: ano },
      ant: { month: mes === 1 ? 12 : mes - 1, year: mes === 1 ? ano - 1 : ano },
      prox: { month: mes === 12 ? 1 : mes + 1, year: mes === 12 ? ano + 1 : ano },
    };

    // Carregamento Paralelo de Dados (Performance)
    const [totais, fixas, cartao, anotacoes, resumoPessoas, dadosTerceirosRaw, ordemCardsRaw, faturaManualVal] = await Promise.all([repo.getDashboardTotals(userId, mes, ano), repo.getLancamentosPorTipo(userId, 'FIXA', mes, ano), repo.getLancamentosPorTipo(userId, 'CARTAO', mes, ano), repo.getAnotacoes(userId), repo.getResumoPessoas(userId, mes, ano, userName), repo.getDadosTerceiros(userId, mes, ano), repo.getOrdemCards(userId), repo.getFaturaManual(userId, mes, ano)]);

    // Processamento dos Cards de Terceiros
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

    // Ordenação Personalizada dos Cards
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
    res.status(500).send('Erro ao carregar dashboard. Verifique os logs.');
  }
});

// ==============================================================================
// 🛠️ ROTAS INTERNAS (AJAX / CRUD WEB)
// ==============================================================================

// APIs Auxiliares
app.get('/api/lancamentos/recentes', async (req, res) => {
  try {
    res.json(await repo.getUltimosLancamentos(req.session.user.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/anotacoes', async (req, res) => {
  try {
    await repo.updateAnotacoes(req.session.user.id, req.body.conteudo);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/fatura-manual', async (req, res) => {
  try {
    await repo.saveFaturaManual(req.session.user.id, parseInt(req.body.month), parseInt(req.body.year), parseValor(req.body.valor));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/cards/reorder', async (req, res) => {
  try {
    await repo.saveOrdemCards(req.session.user.id, req.body.nomes);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/lancamentos/copiar', async (req, res) => {
  try {
    await repo.copyMonth(req.session.user.id, parseInt(req.body.month), parseInt(req.body.year));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete('/api/lancamentos/mes', async (req, res) => {
  try {
    await repo.deleteMonth(req.session.user.id, parseInt(req.query.month), parseInt(req.query.year));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/lancamentos/status-pessoa', async (req, res) => {
  try {
    await repo.updateStatusBatchPessoa(req.session.user.id, req.body.pessoa, req.body.status, req.body.month, req.body.year, req.session.user.nome);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/api/lancamentos/reorder', async (req, res) => {
  try {
    await repo.reorderLancamentos(req.session.user.id, req.body.itens);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CRUD Unitário (Via Modais do Dashboard)
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
    // Se vier contexto de mês/ano, força a data para aquele mês (dia 10)
    if (context_month && context_year) {
      dataBase = new Date(parseInt(context_year), parseInt(context_month) - 1, 10);
    }

    await repo.addLancamento(req.session.user.id, {
      descricao: (descricao || '').trim(),
      valor: parseValor(valor),
      tipo: dbTipo,
      categoria: dbCategoria,
      status: dbStatus,
      parcelaAtual: pAtual,
      totalParcelas: pTotal,
      nomeTerceiro: nome_terceiro || null,
      dataBase,
    });
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

    let dbTipo = sub_tipo === 'Fixa' ? 'FIXA' : 'CARTAO';
    if (tipo_transacao === 'RENDA') dbTipo = 'RENDA';

    await repo.updateLancamento(req.session.user.id, req.params.id, {
      descricao,
      valor: parseValor(valor),
      tipo: dbTipo,
      categoria: sub_tipo,
      parcelaAtual: pAtual,
      totalParcelas: pTotal,
      nomeTerceiro: nome_terceiro || null,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lancamentos/:id', async (req, res) => {
  try {
    await repo.deleteLancamento(req.session.user.id, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/lancamentos/:id/status', async (req, res) => {
  try {
    await repo.updateStatus(req.session.user.id, req.params.id, req.body.status);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Inicialização do Servidor
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
