import { useState } from 'react'
import type { Issue, MessageType } from '../types'

interface IssueListProps {
  issues: Issue[]
  onUpdateStatus: (type: MessageType, payload?: unknown) => Promise<unknown>
}

type SortField = 'priority' | 'created_at' | 'updated_at' | 'closed_at' | 'title' | 'status'
type SortDirection = 'asc' | 'desc'

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  in_progress: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  blocked: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  closed: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  deferred: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
}

const PRIORITY_COLORS: Record<number, string> = {
  0: 'bg-red-500 text-white',
  1: 'bg-orange-500 text-white',
  2: 'bg-yellow-500 text-black dark:text-black',
  3: 'bg-blue-500 text-white',
  4: 'bg-gray-400 dark:bg-gray-600 text-white',
}

const TYPE_ICONS: Record<string, string> = {
  bug: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  feature: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  task: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  epic: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  chore: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

// Smart date formatting: relative for recent, short for older
function formatDate(dateInput?: string | number): { display: string; full: string } {
  if (!dateInput) return { display: '-', full: '' }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput)
  if (isNaN(date.getTime())) return { display: '-', full: '' }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  const full = date.toLocaleString()

  // Less than 1 minute
  if (diffMins < 1) return { display: 'just now', full }
  // Less than 1 hour
  if (diffMins < 60) return { display: `${diffMins}m ago`, full }
  // Less than 24 hours
  if (diffHours < 24) return { display: `${diffHours}h ago`, full }
  // Less than 7 days
  if (diffDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return { display: `${dayName} ${time}`, full }
  }
  // Same year
  if (date.getFullYear() === now.getFullYear()) {
    return {
      display: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      full
    }
  }
  // Different year
  return {
    display: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
    full
  }
}

export function IssueList({ issues, onUpdateStatus }: IssueListProps) {
  const [sortField, setSortField] = useState<SortField>('priority')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [labelMode, setLabelMode] = useState<'any' | 'all'>('any')
  const [searchText, setSearchText] = useState<string>('')

  // Get all unique labels
  const allLabels = Array.from(
    new Set(issues.flatMap(i => i.labels || []))
  ).sort()

  // Toggle label selection
  function toggleLabel(label: string) {
    setSelectedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    )
  }

  // Filter issues
  let filtered = issues
  if (statusFilter !== 'all') {
    filtered = filtered.filter(i => i.status === statusFilter)
  }
  if (selectedLabels.length > 0) {
    filtered = filtered.filter(i => {
      const issueLabels = i.labels || []
      if (labelMode === 'any') {
        return selectedLabels.some(l => issueLabels.includes(l))
      } else {
        return selectedLabels.every(l => issueLabels.includes(l))
      }
    })
  }
  if (searchText.trim()) {
    const needle = searchText.toLowerCase().trim()
    filtered = filtered.filter(i =>
      (i.title?.toLowerCase().includes(needle)) ||
      (i.description?.toLowerCase().includes(needle)) ||
      (i.id.toLowerCase().includes(needle))
    )
  }

  // Sort issues
  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number | undefined
    let bVal: string | number | undefined

    switch (sortField) {
      case 'priority':
        aVal = a.priority ?? 2
        bVal = b.priority ?? 2
        break
      case 'created_at':
        aVal = a.created_at ?? ''
        bVal = b.created_at ?? ''
        break
      case 'updated_at':
        aVal = a.updated_at ?? ''
        bVal = b.updated_at ?? ''
        break
      case 'closed_at':
        aVal = a.closed_at ?? ''
        bVal = b.closed_at ?? ''
        break
      case 'title':
        aVal = a.title?.toLowerCase() ?? ''
        bVal = b.title?.toLowerCase() ?? ''
        break
      case 'status':
        aVal = a.status ?? ''
        bVal = b.status ?? ''
        break
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    const isActive = sortField === field
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && (
            <span className="text-gray-400 dark:text-gray-500">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      </th>
    )
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      await onUpdateStatus('update-status', { id, status: newStatus })
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 overflow-hidden">
      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded px-3 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="closed">Closed</option>
            <option value="deferred">Deferred</option>
          </select>
        </div>

        {allLabels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600 dark:text-gray-400">Labels:</label>
            <div className="flex items-center gap-1 flex-wrap">
              {allLabels.map(label => (
                <button
                  key={label}
                  onClick={() => toggleLabel(label)}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                    selectedLabels.includes(label)
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedLabels.length > 1 && (
              <button
                onClick={() => setLabelMode(m => m === 'any' ? 'all' : 'any')}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
              >
                {labelMode === 'any' ? 'any' : 'all'}
              </button>
            )}
            {selectedLabels.length > 0 && (
              <button
                onClick={() => setSelectedLabels([])}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                clear
              </button>
            )}
          </div>
        )}

        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {sorted.length} of {issues.length} issues
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                Type
              </th>
              <SortHeader field="priority">Priority</SortHeader>
              <SortHeader field="title">Title</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Labels
              </th>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="created_at">Created</SortHeader>
              <SortHeader field="updated_at">Updated</SortHeader>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {sorted.map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">
                  {issue.id.split('-').pop()}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${TYPE_ICONS[issue.issue_type || ''] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    {issue.issue_type || 'task'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex w-6 h-6 items-center justify-center text-xs font-bold rounded ${PRIORITY_COLORS[issue.priority ?? 2]}`}>
                    P{issue.priority ?? 2}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">
                  {issue.title || 'Untitled'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(issue.labels || []).map(label => (
                      <span
                        key={label}
                        className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={issue.status || 'open'}
                    onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                    className={`text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer ${STATUS_COLORS[issue.status || 'open']}`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="closed">Closed</option>
                    <option value="deferred">Deferred</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    const { display, full } = formatDate(issue.created_at)
                    return <span title={full}>{display}</span>
                  })()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    const { display, full } = formatDate(issue.updated_at)
                    return <span title={full}>{display}</span>
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
