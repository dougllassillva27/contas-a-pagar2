const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Integrações de Negócio Existentes
const { enviarLancamento } = require('./api/client');
const { loadConfig, saveConfig } = require('./config/loader');
const { logErrorToFile } = require('./config/logger');

let mainWindow = null;
let configWindow = null;
let tray = null;

// Garante Instância Única (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    exibirJanela();
  });

  // Inicialização do App
  app.whenReady().then(() => {
    criarJanela();
    criarJanelaConfig();
    
    const config = loadConfig();

    // Registra o atalho global configurado e inicialização do SO
    registrarAtalhoGlobal(config.hotkey);
    app.setLoginItemSettings({
      openAtLogin: config.autoStart || false
    });

    // CORREÇÃO: Ícone de Bandeja (Tray) e Menu
    const iconPath = path.join(__dirname, 'renderer', 'icon.ico');
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Abrir Widget', click: exibirJanela },
      { label: 'Configurações', click: exibirJanelaConfig },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() }
    ]);
    
    tray.setToolTip('Widget Lançamentos Rápidos');
    tray.setContextMenu(contextMenu);
    tray.on('click', exibirJanela);

    // CORREÇÃO: Registrar IPC handler para submeter o lançamento
    ipcMain.handle('submit-lancamento', async (event, data) => {
      try {
        return await enviarLancamento(data);
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    ipcMain.on('resize-window', (event, height) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        const currentSize = win.getSize();
        const currentWidth = currentSize[0];
        const currentHeight = currentSize[1];
        // Tolerância de 3px para evitar tremores redundantes de sub-pixel/DPI no Windows
        if (Math.abs(currentHeight - height) > 3) {
          win.setSize(currentWidth, height);
        }
        // Restaura a opacidade total após o redimensionamento/inicialização da janela
        if (win.getOpacity() < 1) {
          setTimeout(() => {
            if (win && !win.isDestroyed()) win.setOpacity(1);
          }, 30);
        }
      }
    });

    ipcMain.on('hide-window', () => {
      if (mainWindow) {
        mainWindow.hide();
        mainWindow.setOpacity(1); // Garante opacidade cheia ao ocultar por precaução
      }
    });

    ipcMain.handle('get-config', () => {
      return loadConfig();
    });

    ipcMain.handle('save-config', (event, updates) => {
      const configSalva = saveConfig(updates);
      if (configSalva) {
        if (updates.hotkey) {
          registrarAtalhoGlobal(updates.hotkey);
        }
        if (typeof updates.autoStart !== 'undefined') {
          app.setLoginItemSettings({
            openAtLogin: updates.autoStart
          });
        }
        return { success: true };
      }
      return { success: false, error: 'Erro ao gravar as configurações em disco' };
    });

    ipcMain.on('close-config', () => {
      if (configWindow) {
        configWindow.hide();
      }
    });
  });

  // Finalização Segura
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 800,
    show: false, // Inicia oculta para controle do atalho/tray
    frame: false, // Estilo modal/widget sem barra de título padrão do SO
    transparent: true, // Fix for white edges
    backgroundColor: '#00000000', // Previne quadrados pretos no Windows DWM
    resizable: false,
    skipTaskbar: true, // Comportamento de widget de bandeja
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js') // CORREÇÃO: Injeção segura
    }
  });

  // CORREÇÃO: Carregar UI real do renderer
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('blur', () => {
    // Comportamento clássico de widget: fecha/oculta ao clicar fora
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function exibirJanela() {
  if (!mainWindow) criarJanela();
  
  // Técnica anti-flicker: abre em opacidade zero, ajusta tamanho e DOM no background, então revela
  mainWindow.setOpacity(0);
  mainWindow.show();
  mainWindow.focus();
  
  // CORREÇÃO: Foca o campo 'descricao' no front-end via evento IPC
  mainWindow.webContents.send('focus-form');

  // Salvaguarda: se em 200ms a janela ainda estiver invisível (ex: falha do renderer), força opacidade total
  setTimeout(() => {
    if (mainWindow && mainWindow.getOpacity() < 1) {
      mainWindow.setOpacity(1);
    }
  }, 200);
}

function registrarAtalhoGlobal(atalhoStr) {
  try {
    globalShortcut.unregisterAll();
    const atalho = atalhoStr || 'Ctrl+Alt+N';
    const registrado = globalShortcut.register(atalho, () => {
      if (mainWindow && mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        exibirJanela();
      }
    });
    if (!registrado) {
      console.error(`[Main] Erro ao registrar atalho: ${atalho}`);
    }
  } catch (err) {
    console.error('[Main] Falha fatal de atalho global:', err.message);
  }
}

function criarJanelaConfig() {
  configWindow = new BrowserWindow({
    width: 420,
    height: 480,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  configWindow.loadFile(path.join(__dirname, 'renderer', 'config.html'));

  configWindow.on('blur', () => {
    configWindow.hide();
  });

  configWindow.on('closed', () => {
    configWindow = null;
  });
}

function exibirJanelaConfig() {
  if (!configWindow) criarJanelaConfig();
  configWindow.setOpacity(0);
  configWindow.show();
  configWindow.focus();
  
  // Envia foco/atualização para recarregar configurações no renderer
  configWindow.webContents.send('focus-config');
  
  setTimeout(() => {
    if (configWindow) configWindow.setOpacity(1);
  }, 40);
}

// ==================================================
// CAPTURA GLOBAL DE EXCEÇÕES E ERROS FATAIS
// ==================================================

process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught Exception:', err);
  const logPath = logErrorToFile(err, 'UNCAUGHT_EXCEPTION');
  
  const msgLog = logPath 
    ? `\n\nDetalhes gravados em:\n${logPath}` 
    : '\n\nNão foi possível gravar o arquivo Log_erros.txt devido a restrições de permissão.';

  dialog.showErrorBox(
    'Erro Fatal no Sistema',
    `Ocorreu um erro fatal inesperado no Widget:\n${err.message}${msgLog}`
  );
  
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] Unhandled Rejection:', reason);
  const err = reason instanceof Error ? reason : new Error(String(reason));
  const logPath = logErrorToFile(err, 'UNHANDLED_REJECTION');
  
  const msgLog = logPath 
    ? `\n\nDetalhes gravados em:\n${logPath}` 
    : '\n\nNão foi possível gravar o arquivo Log_erros.txt devido a restrições de permissão.';

  dialog.showErrorBox(
    'Rejeição Fatal não Tratada',
    `Ocorreu uma rejeição assíncrona não tratada no Widget:\n${err.message}${msgLog}`
  );
  
  app.quit();
});