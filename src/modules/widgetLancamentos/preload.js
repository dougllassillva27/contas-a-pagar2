/**
 * Widget Lancamentos - Preload Script
 * Bridge segura entre renderer e main process (contextIsolation enabled)
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetAPI', {
  submitLancamento: (data) => ipcRenderer.invoke('submit-lancamento', data),
  onFocusForm: (callback) => { ipcRenderer.on('focus-form', () => callback()); },
  removeFocusListener: () => { ipcRenderer.removeAllListeners('focus-form'); },
  resizeWindow: (height) => ipcRenderer.send('resize-window', height),
  hideWindow: () => ipcRenderer.send('hide-window'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (updates) => ipcRenderer.invoke('save-config', updates),
  closeConfig: () => ipcRenderer.send('close-config'),
  onFocusConfig: (callback) => { ipcRenderer.on('focus-config', () => callback()); }
});