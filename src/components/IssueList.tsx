import { useState, useEffect, useCallback } from 'react'
import type { Issue, MessageType } from '../types'
import { showToast } from './Toast'

interface IssueListProps {
  issues: Issue[]
  onUpdateStatus: (type: MessageType, payload?: unknown) => Promise<unknown>
  onIssueClick?: (issue: Issue) => void
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

// Get human-readable sort direction hint
function getSortHint(field: SortField, direction: SortDirection): string {
  const hints: Record<SortField, { asc: string; desc: string }> = {
    priority: { asc: 'highest priority on top', desc: 'lowest priority on top' },
    created_at: { asc: 'oldest on top', desc: 'newest on top' },
    updated_at: { asc: 'oldest updates on top', desc: 'newest updates on top' },
    closed_at: { asc: 'oldest closed on top', desc: 'newest closed on top' },
    title: { asc: 'A-Z', desc: 'Z-A' },
    status: { asc: 'A-Z', desc: 'Z-A' },
  }
  return hints[field][direction]
}

// Parse initial state from URL
function getInitialStateFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return {
    sortField: (params.get('sort') as SortField) || 'priority',
    sortDirection: (params.get('dir') as SortDirection) || 'asc',
    statusFilter: params.get('status') || 'all',
    typeFilter: params.get('type') || 'all',
    priorityFilter: params.get('priority') || 'all',
    assigneeFilter: params.get('assignee') || 'all',
    selectedLabels: params.get('labels')?.split(',').filter(Boolean) || [],
    labelMode: (params.get('labelMode') as 'any' | 'all') || 'any',
    searchText: params.get('q') || '',
  }
}

export function IssueList({ issues, onUpdateStatus, onIssueClick }: IssueListProps) {
  const initial = getInitialStateFromUrl()
  const [sortField, setSortField] = useState<SortField>(initial.sortField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initial.sortDirection)
  const [statusFilter, setStatusFilter] = useState<string>(initial.statusFilter)
  const [typeFilter, setTypeFilter] = useState<string>(initial.typeFilter)
  const [priorityFilter, setPriorityFilter] = useState<string>(initial.priorityFilter)
  const [assigneeFilter, setAssigneeFilter] = useState<string>(initial.assigneeFilter)
  const [selectedLabels, setSelectedLabels] = useState<string[]>(initial.selectedLabels)
  const [labelMode, setLabelMode] = useState<'any' | 'all'>(initial.labelMode)
  const [searchText, setSearchText] = useState<string>(initial.searchText)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>('')

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (sortField !== 'priority') params.set('sort', sortField)
    if (sortDirection !== 'asc') params.set('dir', sortDirection)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (priorityFilter !== 'all') params.set('priority', priorityFilter)
    if (assigneeFilter !== 'all') params.set('assignee', assigneeFilter)
    if (selectedLabels.length > 0) params.set('labels', selectedLabels.join(','))
    if (labelMode !== 'any') params.set('labelMode', labelMode)
    if (searchText) params.set('q', searchText)

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }, [sortField, sortDirection, statusFilter, typeFilter, priorityFilter, assigneeFilter, selectedLabels, labelMode, searchText])

  // Get all unique values for filters
  const allLabels = Array.from(new Set(issues.flatMap(i => i.labels || []))).sort()
  const allTypes = Array.from(new Set(issues.map(i => i.issue_type).filter(Boolean))).sort() as string[]
  const allAssignees = Array.from(new Set(issues.map(i => i.assignee).filter(Boolean))).sort() as string[]

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
  if (typeFilter !== 'all') {
    filtered = filtered.filter(i => i.issue_type === typeFilter)
  }
  if (priorityFilter !== 'all') {
    filtered = filtered.filter(i => String(i.priority ?? 2) === priorityFilter)
  }
  if (assigneeFilter !== 'all') {
    if (assigneeFilter === 'unassigned') {
      filtered = filtered.filter(i => !i.assignee)
    } else {
      filtered = filtered.filter(i => i.assignee === assigneeFilter)
    }
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

  // Sort issues (memoized reference for keyboard nav)
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

  // Keyboard navigation: j/k to move, Enter to open
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(prev => Math.min(prev + 1, sorted.length - 1))
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < sorted.length) {
      e.preventDefault()
      onIssueClick?.(sorted[focusedIndex])
    } else if (e.key === 'Escape') {
      setFocusedIndex(-1)
    }
  }, [sorted, focusedIndex, onIssueClick])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Reset focus when filtered list changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [statusFilter, typeFilter, priorityFilter, assigneeFilter, selectedLabels, searchText])

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
    const hint = isActive ? getSortHint(field, sortDirection) : `Click to sort`
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none"
        onClick={() => handleSort(field)}
        title={hint}
        role="columnheader"
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSort(field)
          }
        }}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && (
            <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
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

  async function handleTitleSave(id: string) {
    const newTitle = editingTitle.trim()
    if (!newTitle) {
      setEditingId(null)
      setEditingTitle('')
      return
    }
    try {
      await onUpdateStatus('update-title' as any, { id, title: newTitle })
      showToast('Title updated', 'success')
    } catch (err) {
      showToast('Failed to update title', 'error')
    }
    setEditingId(null)
    setEditingTitle('')
  }

  function startEditing(issue: Issue) {
    setEditingId(issue.id)
    setEditingTitle(issue.title || '')
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 overflow-hidden">
      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center gap-4 flex-wrap">
        {/* Quick views */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setStatusFilter('blocked')
              setTypeFilter('all')
              setPriorityFilter('all')
              setAssigneeFilter('all')
              setSelectedLabels([])
              setSearchText('')
            }}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              statusFilter === 'blocked' && typeFilter === 'all' && priorityFilter === 'all'
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
            title="Show blocked issues"
          >
            Blocked
          </button>
          <button
            onClick={() => {
              setStatusFilter('open')
              setTypeFilter('all')
              setPriorityFilter('all')
              setAssigneeFilter('all')
              setSelectedLabels([])
              setSearchText('')
            }}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              statusFilter === 'open' && typeFilter === 'all' && priorityFilter === 'all'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
            title="Show ready-to-work issues (open, no blockers)"
          >
            Ready
          </button>
          <button
            onClick={() => {
              setStatusFilter('closed')
              setSortField('closed_at')
              setSortDirection('desc')
              setTypeFilter('all')
              setPriorityFilter('all')
              setAssigneeFilter('all')
              setSelectedLabels([])
              setSearchText('')
            }}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              statusFilter === 'closed'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
            title="Show recently closed issues"
          >
            Closed
          </button>
          <button
            onClick={() => {
              setStatusFilter('all')
              setTypeFilter('all')
              setPriorityFilter('all')
              setAssigneeFilter('all')
              setSelectedLabels([])
              setSearchText('')
            }}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              statusFilter === 'all' && typeFilter === 'all' && priorityFilter === 'all' && selectedLabels.length === 0 && !searchText
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
            title="Show all issues"
          >
            All
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-slate-600" />

        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded px-3 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            aria-label="Search issues"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
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

        {allTypes.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              {allTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Priority:</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All</option>
            <option value="0">P0</option>
            <option value="1">P1</option>
            <option value="2">P2</option>
            <option value="3">P3</option>
            <option value="4">P4</option>
          </select>
        </div>

        {allAssignees.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Assignee:</label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              {allAssignees.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}

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
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700" role="grid" aria-label="Issues list">
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16" title="Dependencies">
                Deps
              </th>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="created_at">Created</SortHeader>
              <SortHeader field="updated_at">Updated</SortHeader>
              <SortHeader field="closed_at">Closed</SortHeader>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {sorted.map((issue, index) => (
              <tr
                key={issue.id}
                className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                  focusedIndex === index ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-500' : ''
                }`}
                onClick={() => onIssueClick?.(issue)}
              >
                <td className="px-4 py-3 text-sm font-mono">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        await navigator.clipboard.writeText(issue.id)
                        showToast(`Copied ${issue.id}`, 'success')
                      } catch {
                        showToast('Failed to copy', 'error')
                      }
                    }}
                    className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    title={`Copy ${issue.id}`}
                    aria-label={`Copy issue ID ${issue.id}`}
                  >
                    {issue.id.split('-').pop()}
                  </button>
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
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-md">
                  {editingId === issue.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleTitleSave(issue.id)}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter') {
                          handleTitleSave(issue.id)
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                          setEditingTitle('')
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-sm border border-indigo-500 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="truncate block cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        startEditing(issue)
                      }}
                      title="Double-click to edit"
                    >
                      {issue.title || 'Untitled'}
                    </span>
                  )}
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
                  {(issue.dependency_count ?? 0) > 0 || (issue.dependent_count ?? 0) > 0 ? (
                    <div className="flex items-center gap-1 text-xs">
                      {(issue.dependency_count ?? 0) > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                          title={`${issue.dependency_count} dependencies (blocked by)`}
                        >
                          ←{issue.dependency_count}
                        </span>
                      )}
                      {(issue.dependent_count ?? 0) > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300"
                          title={`${issue.dependent_count} dependents (blocking)`}
                        >
                          →{issue.dependent_count}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={issue.status || 'open'}
                    onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
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
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {issue.closed_at ? (() => {
                    const { display, full } = formatDate(issue.closed_at)
                    return <span title={full}>{display}</span>
                  })() : <span className="text-gray-300 dark:text-gray-600">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
