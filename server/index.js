import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 3001

// Run bd CLI command
function runBd(args) {
  return new Promise((resolve) => {
    const child = spawn('bd', args, { shell: false })
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
async function runBdJson(args) {
  const result = await runBd(args)
  if (result.code !== 0) {
    return { ok: false, error: result.stderr }
  }
  try {
    return { ok: true, data: JSON.parse(result.stdout || '[]') }
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }
}

// Create HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Beads Better UI Server')
})

// Create WebSocket server
const wss = new WebSocketServer({ server })

// Track subscriptions
const subscriptions = new Map()

wss.on('connection', (ws) => {
  console.log('Client connected')
  const clientSubs = new Set()

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString())
      const { id, type, payload } = msg

      let response = { id, type, ok: true, payload: null }

      switch (type) {
        case 'subscribe-list': {
          const listType = payload?.list || 'all-issues'
          clientSubs.add(listType)

          // Fetch initial data
          const result = await runBdJson(['list', '--json'])
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
          const result = await runBd(['update', issueId, '--status', status])
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'UPDATE_ERROR', message: result.stderr }
          } else {
            // Broadcast update to all clients
            broadcastRefresh()
          }
          break
        }

        case 'update-priority': {
          const { id: issueId, priority } = payload || {}
          const result = await runBd(['update', issueId, '--priority', String(priority)])
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'UPDATE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh()
          }
          break
        }

        case 'create-issue': {
          const { title, description, type, priority, labels } = payload || {}
          if (!title) {
            response.ok = false
            response.error = { code: 'INVALID_PAYLOAD', message: 'Missing title' }
            break
          }
          const args = ['create', title]
          if (type) args.push('--type', type)
          if (priority !== undefined) args.push('--priority', String(priority))
          if (description) args.push('--description', description)
          if (labels && labels.length > 0) args.push('--labels', labels.join(','))

          const result = await runBd(args)
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'CREATE_ERROR', message: result.stderr }
          } else {
            broadcastRefresh()
          }
          break
        }

        case 'label-add': {
          const { id: issueId, label } = payload || {}
          const result = await runBd(['label', 'add', issueId, label])
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'LABEL_ERROR', message: result.stderr }
          } else {
            broadcastRefresh()
          }
          break
        }

        case 'label-remove': {
          const { id: issueId, label } = payload || {}
          const result = await runBd(['label', 'remove', issueId, label])
          if (result.code !== 0) {
            response.ok = false
            response.error = { code: 'LABEL_ERROR', message: result.stderr }
          } else {
            broadcastRefresh()
          }
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
    clientSubs.clear()
  })
})

// Broadcast refresh to all clients
async function broadcastRefresh() {
  const result = await runBdJson(['list', '--json'])
  if (!result.ok) return

  const msg = JSON.stringify({
    id: 'broadcast',
    type: 'snapshot',
    ok: true,
    payload: { id: 'all-issues', type: 'snapshot', items: result.data }
  })

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(msg)
    }
  })
}

server.listen(PORT, () => {
  console.log(`Beads Better UI server listening on http://localhost:${PORT}`)
})
