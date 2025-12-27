// Preload script for Electron
// Exposes safe APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any needed IPC methods here
  platform: process.platform
})
