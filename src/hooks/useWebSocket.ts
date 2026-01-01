import { useCallback, useEffect, useRef, useState } from 'react'
import type { Issue, MessageType, ReplyEnvelope } from '../types'

interface Project {
  path: string
  name: string
}

interface UseWebSocketReturn {
  connected: boolean
  loading: boolean
  issues: Issue[]
  projectPath: string | null
  projectName: string | null
  isGlobalMode: boolean
  projects: Project[]
  send: (type: MessageType, payload?: unknown) => Promise<unknown>
}

interface BeadsAPI {
  getConfig: () => { port: number; projectPath: string } | null
  onConfigReady: (callback: (config: { port: number; projectPath: string }) => void) => void
  openProjectDialog: () => Promise<{ port: number; projectPath: string } | null>
  platform: string
}

declare global {
  interface Window {
    beadsAPI?: BeadsAPI
  }
}

function nextId(): string {
  const now = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${now}-${rand}`
}

// Get project path from URL pathname
function getProjectPathFromUrl(): string | null {
  const pathname = window.location.pathname
  // Remove leading slash, ignore if empty or just '/'
  const path = pathname.replace(/^\//, '')
  if (!path || path === '') return null
  return path
}

export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [issues, setIssues] = useState<Issue[]>([])
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string | null>(null)
  const [isGlobalMode, setIsGlobalMode] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>>(new Map())

  const send = useCallback((type: MessageType, payload?: unknown): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }
      const id = nextId()
      pendingRef.current.set(id, { resolve, reject })
      wsRef.current.send(JSON.stringify({ id, type, payload }))
    })
  }, [])

  useEffect(() => {
    function connectWithUrl(wsUrl: string, projectPathFromUrl: string | null) {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)

        // If we have a project path from URL, set it first
        if (projectPathFromUrl) {
          const setProjectId = nextId()
          pendingRef.current.set(setProjectId, {
            resolve: (payload: unknown) => {
              const result = payload as { path: string; name: string } | undefined
              if (result) {
                setProjectPath(result.path)
                setProjectName(result.name)
              }
              // Then subscribe to issues
              const subscribeId = nextId()
              ws.send(JSON.stringify({
                id: subscribeId,
                type: 'subscribe-list',
                payload: { list: 'all-issues' }
              }))
            },
            reject: (err: Error) => {
              console.error('Failed to set project:', err)
              setLoading(false)
            }
          })
          ws.send(JSON.stringify({
            id: setProjectId,
            type: 'set-project',
            payload: { path: projectPathFromUrl }
          }))
        } else {
          // No project in URL - subscribe to global issues
          setIsGlobalMode(true)
          setProjectName('All Projects')
          const subscribeId = nextId()
          ws.send(JSON.stringify({
            id: subscribeId,
            type: 'subscribe-global'
          }))
        }
      }

      ws.onclose = () => {
        setConnected(false)
        // Reconnect after delay
        setTimeout(() => connectWithUrl(wsUrl, projectPathFromUrl), 2000)
      }

      ws.onerror = () => {
        ws.close()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ReplyEnvelope

          // Handle pending request responses
          if (data.id && pendingRef.current.has(data.id)) {
            const { resolve, reject } = pendingRef.current.get(data.id)!
            pendingRef.current.delete(data.id)
            if (data.ok) {
              resolve(data.payload)
            } else {
              reject(new Error(data.error?.message || 'Request failed'))
            }
            return
          }

          // Handle push events
          if (data.type === 'snapshot') {
            const payload = data.payload as { items?: Issue[]; projects?: Project[]; isGlobal?: boolean }
            if (payload?.items) {
              setIssues(payload.items)
              setLoading(false)
            }
            if (payload?.projects) {
              setProjects(payload.projects)
            }
            if (payload?.isGlobal) {
              setIsGlobalMode(true)
            }
          } else if (data.type === 'upsert') {
            const payload = data.payload as { item?: Issue }
            if (payload?.item) {
              setIssues(prev => {
                const idx = prev.findIndex(i => i.id === payload.item!.id)
                if (idx >= 0) {
                  const next = [...prev]
                  next[idx] = payload.item!
                  return next
                }
                return [...prev, payload.item!]
              })
            }
          } else if (data.type === 'delete') {
            const payload = data.payload as { id?: string }
            if (payload?.id) {
              setIssues(prev => prev.filter(i => i.id !== payload.id))
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Get project path from URL
    const projectPathFromUrl = getProjectPathFromUrl()

    // Check if we're in Electron
    if (window.beadsAPI) {
      // In Electron, use config from main process
      window.beadsAPI.onConfigReady((config) => {
        const wsUrl = `ws://localhost:${config.port}/ws`
        // In Electron, project path comes from the config, not URL
        setProjectPath(config.projectPath)
        setProjectName(config.projectPath.split('/').pop() || null)
        connectWithUrl(wsUrl, config.projectPath)
      })
    } else {
      // Running in browser - connect to server on port 3050
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname
      const port = window.location.port || '3050'
      const wsUrl = `${protocol}//${host}:${port}/ws`
      connectWithUrl(wsUrl, projectPathFromUrl)
    }

    return () => {
      wsRef.current?.close()
    }
  }, [])

  return { connected, loading, issues, projectPath, projectName, isGlobalMode, projects, send }
}
