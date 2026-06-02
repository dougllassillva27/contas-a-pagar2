require('dotenv').config();
const repo = require('./src/repositories/LancamentoRepository');

async function run() {
  try {
    console.log("Chamando dashboard data...");
    const data = await repo.getDashboardDataBatched(1, 6, 2026, 'Dodo');
    console.log("Dashboard OK");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
