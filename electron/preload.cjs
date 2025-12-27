// Preload script for Electron
// Exposes safe APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron')

// Store config when received from main process
let beadsConfig = null
const configCallbacks = []

ipcRenderer.on('beads-config', (event, config) => {
  beadsConfig = config
  // Notify all waiting callbacks
  configCallbacks.forEach(cb => cb(config))
  configCallbacks.length = 0
})

contextBridge.exposeInMainWorld('beadsAPI', {
  getConfig: () => beadsConfig,
  onConfigReady: (callback) => {
    if (beadsConfig) {
      callback(beadsConfig)
    } else {
      configCallbacks.push(callback)
    }
  },
  platform: process.platform
})
