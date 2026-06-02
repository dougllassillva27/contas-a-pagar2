require('dotenv').config();
const db = require('./src/config/db');

async function run() {
  try {
    const res = await db.query("SELECT Id, UsuarioId, Descricao, Valor, Status FROM Lancamentos ORDER BY Id DESC LIMIT 10");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
