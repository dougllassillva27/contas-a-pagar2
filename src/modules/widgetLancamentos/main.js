const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Integrações de Negócio Existentes
const { enviarLancamento } = require('./api/client');
const { loadConfig } = require('./config/loader');

let mainWindow = null;
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
    
    const config = loadConfig();

    // CORREÇÃO: Atalho Global Funcional
    globalShortcut.register(config.hotkey || 'Ctrl+Alt+N', () => {
      if (mainWindow && mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        exibirJanela();
      }
    });

    // CORREÇÃO: Ícone de Bandeja (Tray) e Menu
    const iconPath = path.join(__dirname, 'renderer', 'favicon.ico');
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Abrir Widget', click: exibirJanela },
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
      if (mainWindow) {
        mainWindow.setSize(500, height);
      }
    });

    ipcMain.on('hide-window', () => {
      if (mainWindow) mainWindow.hide();
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
    height: 700,
    show: false, // Inicia oculta para controle do atalho/tray
    frame: false, // Estilo modal/widget sem barra de título padrão do SO
    transparent: true, // Fix for white edges
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
  mainWindow.show();
  mainWindow.focus();
  
  // CORREÇÃO: Foca o campo 'descricao' no front-end via evento IPC
  mainWindow.webContents.send('focus-form');
}