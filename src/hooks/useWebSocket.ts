import { useCallback, useEffect, useRef, useState } from 'react'
import type { Issue, MessageType, ReplyEnvelope } from '../types'

interface UseWebSocketReturn {
  connected: boolean
  issues: Issue[]
  send: (type: MessageType, payload?: unknown) => Promise<unknown>
}

function nextId(): string {
  const now = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${now}-${rand}`
}

export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false)
  const [issues, setIssues] = useState<Issue[]>([])
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        // Subscribe to all issues
        const id = nextId()
        ws.send(JSON.stringify({
          id,
          type: 'subscribe-list',
          payload: { list: 'all-issues' }
        }))
      }

      ws.onclose = () => {
        setConnected(false)
        // Reconnect after delay
        setTimeout(connect, 2000)
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
            const payload = data.payload as { items?: Issue[] }
            if (payload?.items) {
              setIssues(payload.items)
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

    connect()

    return () => {
      wsRef.current?.close()
    }
  }, [])

  return { connected, issues, send }
}
