const path = require('path');
const fs = require('fs');
const os = require('os');
const { logErrorToFile } = require('./logger');

// Constantes e Defaults padrão
const DEFAULTS = {
  apiUrl: 'http://localhost:3000',
  apiToken: '',
  hotkey: 'Ctrl+Alt+N',
  defaultUserId: 1,
  autoStart: false,
  autoCloseOnSuccess: true,
  timeout: 10000
};

// Caminhos configurados dinamicamente
const SHIPPED_CONFIG_PATH = path.join(__dirname, 'default.json');
let userDataPath;

try {
  // Tenta carregar o processo do Electron de forma robusta
  const electron = require('electron');
  const app = electron.app || (electron.remote && electron.remote.app);
  if (app) {
    userDataPath = app.getPath('userData');
  } else {
    userDataPath = path.join(os.homedir(), '.widget-lancamentos');
  }
} catch (e) {
  // Fallback seguro em caso de execução fora do Electron (ex: testes unitários com Jest)
  userDataPath = path.join(os.homedir(), '.widget-lancamentos');
}

const USER_CONFIG_PATH = path.join(userDataPath, 'default.json');

// Garante que o diretório persistente exista
try {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
} catch (err) {
  console.error('[Config] Falha ao criar pasta userData:', err.message);
  logErrorToFile(err, 'CONFIG_INIT_ERROR');
}

function loadConfig() {
  let userConfig = {};
  
  try {
    // Cenário 1: Se já existe no userData do usuário, lê diretamente
    if (fs.existsSync(USER_CONFIG_PATH)) {
      const raw = fs.readFileSync(USER_CONFIG_PATH, 'utf8');
      userConfig = JSON.parse(raw);
    } 
    // Cenário 2: Primeira execução. Copia o default.json enviado no pacote (shipped)
    else if (fs.existsSync(SHIPPED_CONFIG_PATH)) {
      const raw = fs.readFileSync(SHIPPED_CONFIG_PATH, 'utf8');
      userConfig = JSON.parse(raw);
      // Grava no destino persistente para inicializar o arquivo de escrita do usuário
      fs.writeFileSync(USER_CONFIG_PATH, JSON.stringify(userConfig, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('[Config] Erro ao carregar configurações:', err.message);
    logErrorToFile(err, 'CONFIG_LOAD_ERROR');
  }

  // Merge das configurações carregadas com os padrões
  const config = { ...DEFAULTS, ...userConfig };

  // Validações básicas de segurança e integridade
  if (!config.apiUrl || !config.apiUrl.startsWith('http')) {
    console.warn('[Config] apiUrl inválida, assumindo padrão.');
    config.apiUrl = DEFAULTS.apiUrl;
  }
  
  if (!config.apiToken || config.apiToken === 'SEU_API_TOKEN_AQUI') {
    console.warn('[Config] apiToken não configurado.');
  }

  return config;
}

function saveConfig(updates) {
  try {
    const current = loadConfig();
    const merged = { ...current, ...updates };

    // Limpa tokens vazios ou de placeholder
    if (merged.apiToken === '' || merged.apiToken === 'SEU_API_TOKEN_AQUI') {
      delete merged.apiToken;
    }

    // Gravação atômica na pasta userData persistente
    fs.writeFileSync(USER_CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Config] Erro fatal ao salvar configurações em disco:', err.message);
    logErrorToFile(err, 'CONFIG_SAVE_ERROR');
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigPath: () => USER_CONFIG_PATH,
  getShippedConfigPath: () => SHIPPED_CONFIG_PATH,
  DEFAULTS
};