const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Grava mensagens de erro estruturadas com timestamps locais em Log_erros.txt.
 * Tenta primeiro a pasta do executável e, se falhar, utiliza o diretório userData.
 * 
 * @param {Error|string} error Erro a ser registrado
 * @param {string} type Tipo ou Categoria do erro
 * @returns {string|null} Caminho do arquivo escrito ou null em falha completa
 */
function logErrorToFile(error, type = 'ERROR') {
  let app;
  try {
    const electron = require('electron');
    app = electron.app || (electron.remote && electron.remote.app);
  } catch (e) {
    // Fora do Electron (Jest/testes)
  }

  const localTime = new Date().toLocaleString('pt-BR');
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  const formattedError = `
==================================================
TIMESTAMP: ${localTime}
TYPE: ${type}
MESSAGE: ${errorObj.message}
STACK: ${errorObj.stack || 'Sem Stack Trace disponível'}
==================================================
`;

  const isPackaged = app ? app.isPackaged : false;

  const attemptExecutableDir = () => {
    try {
      const execDir = path.dirname(process.execPath);
      const primaryLogPath = path.join(execDir, 'Log_erros.txt');
      fs.appendFileSync(primaryLogPath, formattedError, 'utf8');
      console.log(`[Logger] Log salvo no diretório do executável: ${primaryLogPath}`);
      return primaryLogPath;
    } catch (errExec) {
      console.warn(`[Logger] Falha ao gravar no executável: ${errExec.message}`);
      return null;
    }
  };

  const attemptUserDataDir = () => {
    try {
      let userDataDir;
      if (app) {
        userDataDir = app.getPath('userData');
      } else {
        userDataDir = path.join(os.homedir(), '.widget-lancamentos');
      }

      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      const fallbackLogPath = path.join(userDataDir, 'Log_erros.txt');
      fs.appendFileSync(fallbackLogPath, formattedError, 'utf8');
      console.log(`[Logger] Log salvo no userData: ${fallbackLogPath}`);
      return fallbackLogPath;
    } catch (errUser) {
      console.error(`[Logger] Falha ao gravar no userData: ${errUser.message}`);
      return null;
    }
  };

  if (isPackaged) {
    // Em produção oficial (empacotado): Prioridade absoluta para userDataPath para evitar restrições do sistema
    const res = attemptUserDataDir();
    if (res) return res;
    return attemptExecutableDir();
  } else {
    // Em desenvolvimento local ou testes: Prioridade para diretório local de execução
    const res = attemptExecutableDir();
    if (res) return res;
    return attemptUserDataDir();
  }
  
  return null;
}

module.exports = { logErrorToFile };
