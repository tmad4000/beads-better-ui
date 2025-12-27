const { app, BrowserWindow, dialog, Menu, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

// Set app name before ready
app.setName('Beads UI')
if (process.platform === 'darwin') {
  process.title = 'Beads UI'
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Track all windows and their associated servers
const windows = new Map() // windowId -> { window, serverProcess, projectPath }

// Recent projects (stored in memory, could persist to file)
let recentProjects = []
const MAX_RECENT = 10

function loadRecentProjects() {
  try {
    const configPath = path.join(app.getPath('userData'), 'recent-projects.json')
    if (fs.existsSync(configPath)) {
      recentProjects = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (e) {
    recentProjects = []
  }
}

function saveRecentProjects() {
  try {
    const configPath = path.join(app.getPath('userData'), 'recent-projects.json')
    fs.writeFileSync(configPath, JSON.stringify(recentProjects, null, 2))
  } catch (e) {
    console.error('Failed to save recent projects:', e)
  }
}

function addRecentProject(projectPath) {
  // Remove if already exists
  recentProjects = recentProjects.filter(p => p !== projectPath)
  // Add to front
  recentProjects.unshift(projectPath)
  // Limit size
  recentProjects = recentProjects.slice(0, MAX_RECENT)
  saveRecentProjects()
  buildMenu() // Rebuild menu to update recent projects
}

async function selectProjectFolder() {
  const result = await dialog.showOpenDialog({
    title: 'Select a Beads Project',
    properties: ['openDirectory'],
    message: 'Choose a folder with a .beads directory'
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const selectedPath = result.filePaths[0]
  const beadsDir = path.join(selectedPath, '.beads')

  if (!fs.existsSync(beadsDir)) {
    dialog.showErrorBox(
      'Not a Beads Project',
      `No .beads directory found in ${selectedPath}.\n\nRun 'bd init <prefix>' first to initialize beads.`
    )
    return null
  }

  return selectedPath
}

async function startServer(projectDir) {
  return new Promise((resolve) => {
    const serverPath = isDev
      ? path.join(__dirname, '..', 'server', 'index.js')
      : path.join(process.resourcesPath, 'server', 'index.js')

    // Find available port
    const port = 3100 + Math.floor(Math.random() * 900)

    const serverProcess = spawn('node', [serverPath], {
      cwd: projectDir,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server [${port}]: ${data}`)
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server error [${port}]: ${data}`)
    })

    // Give server time to start
    setTimeout(() => resolve({ serverProcess, port }), 1500)
  })
}

async function createWindow(projectPath) {
  if (!projectPath) {
    projectPath = await selectProjectFolder()
    if (!projectPath) {
      // No project selected
      if (windows.size === 0) {
        app.quit()
      }
      return null
    }
  }

  // Start the backend server for this project
  const { serverProcess, port } = await startServer(projectPath)

  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    title: `Beads UI - ${path.basename(projectPath)}`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // Track this window
  const windowId = window.id
  windows.set(windowId, { window, serverProcess, projectPath, port })

  // Add to recent projects
  addRecentProject(projectPath)

  // Set dock icon on macOS - disabled for now due to icon loading issues
  // if (process.platform === 'darwin' && windows.size === 1) {
  //   try {
  //     const iconPath = isDev
  //       ? path.join(__dirname, '..', 'assets', 'BeadsUI.icns')
  //       : path.join(process.resourcesPath, 'assets', 'BeadsUI.icns')
  //
  //     if (fs.existsSync(iconPath)) {
  //       app.dock.setIcon(iconPath)
  //     }
  //   } catch (e) {
  //     console.error('Failed to set dock icon:', e)
  //   }
  // }

  if (isDev) {
    // In development, load from Vite dev server with server port param
    const vitePort = process.env.VITE_PORT || 5173
    window.loadURL(`http://localhost:${vitePort}`)
    // window.webContents.openDevTools()
  } else {
    // In production, load built files
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Send config to renderer via IPC
  window.webContents.on('did-finish-load', () => {
    window.webContents.send('beads-config', {
      port,
      projectPath
    })
  })

  window.on('closed', () => {
    const data = windows.get(windowId)
    if (data && data.serverProcess) {
      data.serverProcess.kill()
    }
    windows.delete(windowId)
  })

  return window
}

function buildMenu() {
  const recentSubmenu = recentProjects.length > 0
    ? [
        ...recentProjects.map(projectPath => ({
          label: path.basename(projectPath),
          sublabel: projectPath,
          click: () => createWindow(projectPath)
        })),
        { type: 'separator' },
        {
          label: 'Clear Recent',
          click: () => {
            recentProjects = []
            saveRecentProjects()
            buildMenu()
          }
        }
      ]
    : [{ label: 'No Recent Projects', enabled: false }]

  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const focusedWindow = BrowserWindow.getFocusedWindow()
            const projectPath = await selectProjectFolder()
            if (projectPath) {
              if (focusedWindow && windows.has(focusedWindow.id)) {
                // Close current window and open new one
                focusedWindow.close()
              }
              createWindow(projectPath)
            }
          }
        },
        {
          label: 'Open in New Window...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const projectPath = await selectProjectFolder()
            if (projectPath) {
              createWindow(projectPath)
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Recent Projects',
          submenu: recentSubmenu
        },
        { type: 'separator' },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow(null)
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Beads Documentation',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/steveyegge/beads')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Handle opening files/folders dropped on dock icon
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (fs.statSync(filePath).isDirectory()) {
    const beadsDir = path.join(filePath, '.beads')
    if (fs.existsSync(beadsDir)) {
      if (app.isReady()) {
        createWindow(filePath)
      } else {
        app.whenReady().then(() => createWindow(filePath))
      }
    }
  }
})

app.whenReady().then(() => {
  loadRecentProjects()
  buildMenu()
  createWindow(null)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (windows.size === 0) {
    createWindow(null)
  }
})

app.on('before-quit', () => {
  // Kill all server processes
  for (const [, data] of windows) {
    if (data.serverProcess) {
      data.serverProcess.kill()
    }
  }
})
