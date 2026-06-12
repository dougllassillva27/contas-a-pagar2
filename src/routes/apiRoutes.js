// ==============================================================================
// 🛡️ ROTAS PROTEGIDAS (WEB) — Dashboard, CRUD, APIs
// Refatorado: apiRoutes.js agora é um facade que delega para módulos por domínio.
// ==============================================================================

const express = require('express');
const router = express.Router();

module.exports = function (repo) {
  // Importa e registra os módulos por domínio
  const dashboardRoutes = require('./dashboard/dashboardRoutes')(repo);
  const terceirosRoutes = require('./terceiros/terceirosRoutes')(repo);
  const configuracoesRoutes = require('./configuracoes/configuracoesRoutes')(repo);
  const lancamentosRoutes = require('./lancamentos/lancamentosRoutes')(repo);
  const outrosRoutes = require('./outros/outrosRoutes')(repo);

  // Monta todas as rotas nos mesmos paths anteriores
  router.use('/', dashboardRoutes);
  router.use('/', terceirosRoutes);
  router.use('/', configuracoesRoutes);
  router.use('/', lancamentosRoutes);
  router.use('/', outrosRoutes);

  return router;
};
