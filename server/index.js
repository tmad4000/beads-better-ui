import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3050
const DIST_DIR = join(__dirname, '..', 'dist')

// Directories to search for short project names
const SEARCH_PATHS = [
  join(homedir(), 'code'),
  join(homedir(), 'projects'),
  join(homedir(), 'Developer'),
  join(homedir(), 'dev'),
]

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

// Resolve a project path from URL
// - Full paths like /Users/jacob/code/foo -> use directly
// - Short names like /foo -> search in SEARCH_PATHS
function resolveProjectPath(urlPath) {
  // Remove leading slash and any query params
  let cleanPath = urlPath.replace(/^\//, '').split('?')[0]

  // If empty, no project
  if (!cleanPath) return null

  // If it looks like a full path (starts with Users, home, etc.)
  if (cleanPath.startsWith('Users/') || cleanPath.startsWith('home/')) {
    const fullPath = '/' + cleanPath
    if (existsSync(join(fullPath, '.beads'))) {
      return fullPath
    }
    return null
  }

  // Otherwise, treat as a short name and search
  for (const searchPath of SEARCH_PATHS) {
    const candidate = join(searchPath, cleanPath)
    if (existsSync(join(candidate, '.beads'))) {
      return candidate
    }
  }

  return null
}

// Get seen file path for a project
function getSeenFilePath(projectPath) {
  return join(projectPath, '.beads', 'seen.json')
}

// Read seen.json file for a project
async function readSeenFile(projectPath) {
  try {
    const seenFile = getSeenFilePath(projectPath)
    if (!existsSync(seenFile)) {
      return { seen: [], updated_at: null }
    }
    const content = await readFile(seenFile, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { seen: [], updated_at: null }
  }
}

// Write seen.json file for a project
async function writeSeenFile(projectPath, data) {
  try {
    const seenFile = getSeenFilePath(projectPath)
    const content = JSON.stringify({
      seen: data.seen || [],
      updated_at: new Date().toISOString()
    }, null, 2)
    await writeFile(seenFile, content, 'utf-8')
    return true
  } catch (err) {
    console.error('Error writing seen.json:', err)
    return false
  }
}

// Run bd CLI command in a specific project directory
function runBd(args, projectPath) {
  return new Promise((resolve) => {
    const child = spawn('bd', args, {
      shell: false,
      cwd: projectPath
    })
    const stdout = []
    const stderr = []

    child.stdout?.on('data', (chunk) => stdout.push(chunk.toString()))
    child.stderr?.on('data', (chunk) => stderr.push(chunk.toString()))

    child.on('error', () => resolve({ code: 127, stdout: '', stderr: 'Command not found' }))
    child.on('close', (code) => {
      resolve({
        code: code || 0,
        stdout: stdout.join(''),
        stderr: stderr.join('')
      })
    })
  })
}

// Parse JSON from bd output
async function runBdJson(args, projectPath) {
  const result = await runBd(args, projectPath)
  if (result.code !== 0) {
    return { ok: false, error: result.stderr }
  }
  try {
    return { ok: true, data: JSON.parse(result.stdout || '[]') }
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }
}

// Serve static files from dist directory
async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  let filePath = url.pathname

  // Check if this is a static asset request
  const ext = extname(filePath)
  if (ext && MIME_TYPES[ext]) {
    // Serve static file from dist
    const fullPath = join(DIST_DIR, filePath)

    // Security: prevent directory traversal
    if (!fullPath.startsWith(DIST_DIR)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    try {
      const content = await readFile(fullPath)
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] })
      res.end(content)
      return
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404)
        res.end('Not Found')
        return
      }
      res.writeHead(500)
      res.end('Internal Server Error')
      return
    }
  }

  // For all other paths, serve index.html (SPA routing)
  try {
    const indexContent = await readFile(join(DIST_DIR, 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(indexContent)
  } catch {
    res.writeHead(404)
    res.end('Not Found - Run npm run build first')
  }
}

// Create HTTP server
const server = createServer(serveStatic)

// Create WebSocket server
const wss = new WebSocketServer({ server })

// Track client subscriptions and their project paths
const clientData = new WeakMap()

wss.on('connection', (ws, req) => {
  console.log('Client connected')

  // Initialize client data
  clientData.set(ws, {
    projectPath: null,
    subscriptions: new Set()
  })

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString())
      const { id, type, payload } = msg
      const client = clientData.get(ws)

      let response = { id, type, ok: true, payload: null }

      // Handle set-project message to establish project context
      if (type === 'set-project') {
        const { path: projectPath } = payload || {}
        const resolved = resolveProjectPath(projectPath)
        if (resolved) {
          client.projectPath = resolved
          response.payload = {
            path: resolved,
            name: resolved.split('/').pop()
          }
        } else {
          response.ok = false
          response.error = { code: 'INVALID_PROJECT', message: `Not a beads project: ${projectPath}` }
        }
        ws.send(JSON.stringify(response))
        return
      }

      // All other commands require a project path
      // Can come from payload.path or from previously set project
      let projectPath = payload?.path ? resolveProjectPath(payload.path) : client.projectPath

      if (!projectPath) {
        response.ok = false
        response.error = { code: 'NO_PROJECT', message: 'No project path set. Send set-project first or include path in payload.' }
        ws.send(JSON.stringify(response))
        return
      }

      switch (type) {
        case 'subscribe-list': {
          const listType = payload?.list || 'all-issues'
          client.subscriptions.add(listType)

          // Fetch initial data
          const result = await runBdJson(['list', '--json'], projectPath)
          if (result.ok) {
            response.type = 'snapshot'
            response.payload = { id: listType, type: 'snapshot', items: result.data }
          } else {
            response.ok = false
            response.error = { code: 'FETCH_ERROR', message: result.error }
          }
          break
        }

        case 'update-status': {
          const { id: issueId, status } = payload || {}
          if (!issueId || !status) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id or status' }
            break
          }
          const result = await runBd(['update', issueId, '--status', status], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'UPDATE_ERROR', message: result.stderr }
          } else {
            // Broadcast update to all clients watching this project
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'update-priority': {
          const { id: issueId, priority } = payload || {}
          const result = await runBd(['update', issueId, '--priority', String(priority)], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'UPDATE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'update-title': {
          const { id: issueId, title } = payload || {}
          if (!issueId || !title) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id or title' }
            break
          }
          const result = await runBd(['update', issueId, '--title', title], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'UPDATE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'update-type': {
          const { id: issueId, type: issueType } = payload || {}
          if (!issueId || !issueType) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id or type' }
            break
          }
          const result = await runBd(['update', issueId, '--type', issueType], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'UPDATE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'update-estimate': {
          const { id: issueId, estimate } = payload || {}
          if (!issueId) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id' }
            break
          }
          const result = await runBd(['update', issueId, '--estimate', String(estimate || 0)], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'UPDATE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'update-external-ref': {
          const { id: issueId, externalRef } = payload || {}
          if (!issueId) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id' }
            break
          }
          const result = await runBd(['update', issueId, '--external-ref', externalRef || ''], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'UPDATE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'create-issue': {
          const { title, description, type: issueType, priority, labels, parentId } = payload || {}
          if (!title) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing title' }
            break
          }
          const args = ['create', title]
          if (issueType) args.push('--type', issueType)
          if (priority !== undefined) args.push('--priority', String(priority))
          if (description) args.push('--description', description)
          if (labels && labels.length > 0) args.push('--labels', labels.join(','))
          if (parentId) args.push('--parent', parentId)

          const result = await runBd(args, projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'CREATE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'label-add': {
          const { id: issueId, label } = payload || {}
          const result = await runBd(['label', 'add', issueId, label], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'LABEL_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'delete-issue': {
          const { id: issueId } = payload || {}
          if (!issueId) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id' }
            break
          }
          const result = await runBd(['delete', issueId, '--force'], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'DELETE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'label-remove': {
          const { id: issueId, label } = payload || {}
          const result = await runBd(['label', 'remove', issueId, label], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'LABEL_ERROR', message: result.stderr }
          } else {
            broadcastRefresh(projectPath)
          }
          break
        }

        case 'show-issue': {
          const { id: issueId } = payload || {}
          if (!issueId) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id' }
            break
          }
          const result = await runBdJson(['show', issueId, '--json'], projectPath)
          if (!result.ok) {
            response.ok = false
            response.error = { code: 'SHOW_ERROR', message: result.error }
          } else {
            response.payload = Array.isArray(result.data) ? result.data[0] : result.data
          }
          break
        }

        case 'add-comment': {
          const { id: issueId, content } = payload || {}
          if (!issueId || !content) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id or content' }
            break
          }
          const result = await runBd(['comments', 'add', issueId, content], projectPath)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'COMMENT_ERROR', message: result.stderr }
          } else {
            const showResult = await runBdJson(['show', issueId, '--json'], projectPath)
            if (showResult.ok) {
              response.payload = Array.isArray(showResult.data) ? showResult.data[0] : showResult.data
            }
          }
          break
        }

        case 'get-seen': {
          const seenData = await readSeenFile(projectPath)
          response.payload = seenData
          break
        }

        case 'mark-seen': {
          const { id: issueId } = payload || {}
          if (!issueId) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id' }
            break
          }
          const seenData = await readSeenFile(projectPath)
          if (!seenData.seen.includes(issueId)) {
            seenData.seen.push(issueId)
            await writeSeenFile(projectPath, seenData)
          }
          response.payload = seenData
          break
        }

        case 'mark-unseen': {
          const { id: issueId } = payload || {}
          if (!issueId) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing id' }
            break
          }
          const seenData = await readSeenFile(projectPath)
          seenData.seen = seenData.seen.filter(id => id !== issueId)
          await writeSeenFile(projectPath, seenData)
          response.payload = seenData
          break
        }

        case 'get-project-info': {
          response.payload = {
            path: projectPath,
            name: projectPath.split('/').pop()
          }
          break
        }

        case 'open-in-finder': {
          spawn('open', [projectPath], { detached: true })
          response.payload = { opened: true }
          break
        }

        default:
          response.ok = false
          response.error = { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${type}` }
      }

      ws.send(JSON.stringify(response))
    } catch (err) {
      console.error('Error handling message:', err)
    }
  })

  ws.on('close', () => {
    console.log('Client disconnected')
    clientData.delete(ws)
  })
})

// Broadcast refresh to all clients watching a specific project
async function broadcastRefresh(projectPath) {
  const result = await runBdJson(['list', '--json'], projectPath)
  if (!result.ok) return

  const msg = JSON.stringify({
    id: 'broadcast',
    type: 'snapshot',
    ok: true,
    payload: { id: 'all-issues', type: 'snapshot', items: result.data }
  })

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      const data = clientData.get(client)
      // Only send to clients watching this project
      if (data && data.projectPath === projectPath) {
        client.send(msg)
      }
    }
  })
}

server.listen(PORT, () => {
  console.log(`Beads Better UI server listening on http://localhost:${PORT}`)
  console.log(`Open a project: http://localhost:${PORT}/<project-name>`)
})
