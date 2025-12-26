import { useEffect, useState } from 'react'
import { IssueList } from './components/IssueList'
import { ToastContainer } from './components/Toast'
import { useWebSocket } from './hooks/useWebSocket'

interface BeadsInfo {
  project: string
  issueCount: number
}

function App() {
  const { connected, issues, send } = useWebSocket()
  const [beadsInfo, setBeadsInfo] = useState<BeadsInfo | null>(null)

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
          </div>
          <div className="flex items-center gap-2">
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
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Connecting to server...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No issues found</p>
          </div>
        ) : (
          <IssueList issues={issues} onUpdateStatus={send} />
        )}
      </main>

      <ToastContainer />
    </div>
  )
}

export default App
