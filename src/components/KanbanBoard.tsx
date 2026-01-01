import { useState } from 'react'
import type { Issue, MessageType } from '../types'
import { showToast } from './Toast'

const isCompactMode = new URLSearchParams(window.location.search).has('compact')

interface KanbanBoardProps {
  issues: Issue[]
  onUpdateStatus: (type: MessageType, payload?: unknown) => Promise<unknown>
  onIssueClick?: (issue: Issue) => void
  isGlobalMode?: boolean
}

const STATUSES = [
  { key: 'open', label: 'Open', color: 'bg-green-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { key: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { key: 'closed', label: 'Closed', color: 'bg-purple-500' },
  { key: 'deferred', label: 'Deferred', color: 'bg-gray-500' },
]

const PRIORITY_COLORS: Record<number, string> = {
  0: 'bg-red-500',
  1: 'bg-orange-500',
  2: 'bg-yellow-500',
  3: 'bg-blue-500',
  4: 'bg-gray-400',
}

const TYPE_COLORS: Record<string, string> = {
  bug: 'text-red-600 dark:text-red-400',
  feature: 'text-green-600 dark:text-green-400',
  task: 'text-yellow-600 dark:text-yellow-400',
  epic: 'text-orange-600 dark:text-orange-400',
  chore: 'text-gray-600 dark:text-gray-400',
}

export function KanbanBoard({ issues, onUpdateStatus, onIssueClick, isGlobalMode = false }: KanbanBoardProps) {
  const [movingIssue, setMovingIssue] = useState<string | null>(null)

  // Group issues by status
  const columns = STATUSES.map(status => ({
    ...status,
    issues: issues
      .filter(i => (i.status || 'open') === status.key)
      .sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2)),
  }))

  async function handleMoveToStatus(issueId: string, newStatus: string) {
    setMovingIssue(issueId)
    try {
      await onUpdateStatus('update-status', { id: issueId, status: newStatus })
      showToast(`Moved to ${newStatus.replace('_', ' ')}`, 'success')
    } catch {
      showToast('Failed to move issue', 'error')
    } finally {
      setMovingIssue(null)
    }
  }

  return (
    <div className={`flex gap-3 overflow-x-auto pb-2 ${isCompactMode ? 'min-w-0' : ''}`}>
      {columns.map(column => (
        <div
          key={column.key}
          className={`flex-shrink-0 bg-gray-100 dark:bg-slate-800/50 rounded-lg ${
            isCompactMode ? 'w-44' : 'w-72'
          }`}
        >
          {/* Column Header */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${column.color}`} />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {column.label}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {column.issues.length}
            </span>
          </div>

          {/* Cards */}
          <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-200px)] overflow-y-auto">
            {column.issues.map(issue => (
              <div
                key={issue.id}
                onClick={() => onIssueClick?.(issue)}
                className={`bg-white dark:bg-slate-800 rounded-md p-3 shadow-sm border border-gray-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow ${
                  movingIssue === issue.id ? 'opacity-50' : ''
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                    {issue.id.split('-').pop()}
                  </span>
                  <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white rounded ${PRIORITY_COLORS[issue.priority ?? 2]}`}>
                    P{issue.priority ?? 2}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {issue.title || 'Untitled'}
                </h4>

                {/* Project badge in global mode */}
                {isGlobalMode && issue._project && (
                  <a
                    href={`/${issue._project}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block mb-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                    title={issue._projectPath}
                  >
                    {issue._project}
                  </a>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs">
                  <span className={TYPE_COLORS[issue.issue_type || 'task']}>
                    {issue.issue_type || 'task'}
                  </span>

                  {/* Quick move buttons */}
                  <div className="flex gap-1">
                    {STATUSES.filter(s => s.key !== column.key).slice(0, 2).map(targetStatus => (
                      <button
                        key={targetStatus.key}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveToStatus(issue.id, targetStatus.key)
                        }}
                        disabled={movingIssue === issue.id}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title={`Move to ${targetStatus.label}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${targetStatus.color}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Labels */}
                {issue.labels && issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {issue.labels.slice(0, 3).map(label => (
                      <span
                        key={label}
                        className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                      >
                        {label}
                      </span>
                    ))}
                    {issue.labels.length > 3 && (
                      <span className="text-[10px] text-gray-400">
                        +{issue.labels.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {column.issues.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                No issues
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
