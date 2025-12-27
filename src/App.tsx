import { useCallback, useEffect, useState } from 'react'
import { IssueList } from './components/IssueList'
import { IssueOutline } from './components/IssueOutline'
import { KanbanBoard } from './components/KanbanBoard'
import { IssueDetailPanel } from './components/IssueDetailPanel'
import { NewIssueDialog, type NewIssueData } from './components/NewIssueDialog'
import { ToastContainer } from './components/Toast'
import { useWebSocket } from './hooks/useWebSocket'
import type { Issue } from './types'

type ViewMode = 'list' | 'kanban' | 'outline'

interface BeadsInfo {
  project: string
  issueCount: number
}

interface ProjectInfo {
  path: string
  name: string
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-indigo-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const shortcuts = [
    { keys: ['⌘/Ctrl', 'N'], action: 'New issue' },
    { keys: ['j', '↓'], action: 'Move down' },
    { keys: ['k', '↑'], action: 'Move up' },
    { keys: ['Enter'], action: 'Open issue' },
    { keys: ['Esc'], action: 'Close/deselect' },
    { keys: ['?'], action: 'Show shortcuts' },
  ]

  const terminalCommands = [
    { cmd: 'beads-ui', desc: 'Open UI for current directory' },
    { cmd: 'beads-ui /path', desc: 'Open UI for specific project' },
    { cmd: 'beads-ui-list', desc: 'Show running instances' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Help
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
          >
            ×
          </button>
        </div>

        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Keyboard Shortcuts</h3>
        <div className="space-y-2 mb-6">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">{s.action}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((key, ki) => (
                  <span key={ki}>
                    <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-slate-600">
                      {key}
                    </kbd>
                    {ki < s.keys.length - 1 && <span className="text-gray-400 mx-0.5">/</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Terminal Commands</h3>
        <div className="space-y-2 mb-4">
          {terminalCommands.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <code className="text-sm font-mono text-indigo-600 dark:text-indigo-400">{c.cmd}</code>
              <span className="text-xs text-gray-500 dark:text-gray-500">{c.desc}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Dock app: ~/Applications/BeadsUI.app
        </p>
      </div>
    </div>
  )
}

function App() {
  const { connected, loading, issues, send } = useWebSocket()
  const [beadsInfo, setBeadsInfo] = useState<BeadsInfo | null>(null)
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [showNewIssue, setShowNewIssue] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Fetch project info on connect
  useEffect(() => {
    if (connected) {
      send('get-project-info', {}).then((result) => {
        if (result && typeof result === 'object' && 'path' in result) {
          setProjectInfo(result as ProjectInfo)
        }
      }).catch(() => {})
    }
  }, [connected, send])

  // Track which closed issues have been "seen" (reviewed)
  // Stored in .beads/seen.json, synced via git
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  // Fetch seen state from server on connect
  useEffect(() => {
    if (connected) {
      send('get-seen', {}).then((result) => {
        if (result && typeof result === 'object' && 'seen' in result) {
          setSeenIds(new Set((result as { seen: string[] }).seen))
        }
      }).catch(() => {
        // Silently fail - will just show all closed as needing review
      })
    }
  }, [connected, send])

  const markSeen = useCallback((id: string) => {
    setSeenIds(prev => new Set([...prev, id]))
    send('mark-seen', { id }).catch(() => {
      // Revert on error
      setSeenIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    })
  }, [send])

  const markUnseen = useCallback((id: string) => {
    setSeenIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    send('mark-unseen', { id }).catch(() => {
      // Revert on error
      setSeenIds(prev => new Set([...prev, id]))
    })
  }, [send])

  // Detect system dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function updateDarkMode(e: MediaQueryListEvent | MediaQueryList) {
      if (e.matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Set initial value
    updateDarkMode(mediaQuery)

    // Listen for changes
    mediaQuery.addEventListener('change', updateDarkMode)
    return () => mediaQuery.removeEventListener('change', updateDarkMode)
  }, [])

  // Keep selected issue in sync with live data
  useEffect(() => {
    if (selectedIssue) {
      const updated = issues.find(i => i.id === selectedIssue.id)
      if (updated) {
        setSelectedIssue(updated)
      } else {
        // Issue was deleted
        setSelectedIssue(null)
      }
    }
  }, [issues, selectedIssue?.id])

  useEffect(() => {
    // Extract project name from first issue ID prefix
    if (issues.length > 0) {
      const firstId = issues[0].id
      const prefix = firstId.replace(/-[a-z0-9]+$/, '')
      setBeadsInfo({
        project: prefix,
        issueCount: issues.length,
      })
      document.title = `${prefix} - Beads Better UI`
    }
  }, [issues])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowNewIssue(true)
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowShortcuts(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCreateIssue = useCallback(async (data: NewIssueData) => {
    await send('create-issue', data)
  }, [send])

  const handleDeleteIssue = useCallback(async (id: string) => {
    await send('delete-issue', { id })
  }, [send])

  const openInFinder = useCallback(() => {
    send('open-in-finder', {}).catch(() => {})
  }, [send])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {beadsInfo?.project || 'Beads Better UI'}
            </h1>
            {beadsInfo && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {beadsInfo.issueCount} issues
              </span>
            )}
            {projectInfo && (
              <button
                onClick={openInFinder}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                title={`Open ${projectInfo.path} in Finder`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="font-mono truncate max-w-[200px]">{projectInfo.path.replace(/^\/Users\/[^/]+/, '~')}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Epics Quick Filter */}
            <button
              onClick={() => {
                window.location.search = '?type=epic&status=all'
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                window.location.search.includes('type=epic')
                  ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-300 dark:border-slate-600'
              }`}
              title="View all epics"
            >
              Epics
            </button>

            {/* View Toggle */}
            <div className="flex rounded-md border border-gray-300 dark:border-slate-600 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
                title="List view"
              >
                List
              </button>
              <button
                onClick={() => setViewMode('outline')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 dark:border-slate-600 ${
                  viewMode === 'outline'
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
                title="Outline view"
              >
                Outline
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 dark:border-slate-600 ${
                  viewMode === 'kanban'
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
                title="Kanban board"
              >
                Kanban
              </button>
            </div>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowNewIssue(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
              title="New Issue (Ctrl+N)"
            >
              + New Issue
            </button>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                connected
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {!connected ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Spinner />
            <p className="text-gray-500 dark:text-gray-400">Connecting to server...</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Spinner />
            <p className="text-gray-500 dark:text-gray-400">Loading issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No issues found</p>
            <button
              onClick={() => setShowNewIssue(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              Create your first issue
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <IssueList issues={issues} onUpdateStatus={send} onIssueClick={setSelectedIssue} seenIds={seenIds} onMarkSeen={markSeen} />
        ) : viewMode === 'outline' ? (
          <IssueOutline issues={issues} onUpdate={send} onIssueClick={setSelectedIssue} />
        ) : (
          <KanbanBoard issues={issues} onUpdateStatus={send} onIssueClick={setSelectedIssue} />
        )}
      </main>

      <NewIssueDialog
        isOpen={showNewIssue}
        onClose={() => setShowNewIssue(false)}
        onSubmit={handleCreateIssue}
        issues={issues}
      />

      <IssueDetailPanel
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onUpdate={send}
        onDelete={handleDeleteIssue}
        onIssueSelect={setSelectedIssue}
        seenIds={seenIds}
        onMarkUnseen={markUnseen}
      />

      {showShortcuts && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
      )}

      <ToastContainer />
    </div>
  )
}

export default App
