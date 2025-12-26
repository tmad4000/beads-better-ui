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

// Check if issue is stale (not updated in 14+ days)
function isStale(dateInput?: string | number): boolean {
  if (!dateInput) return false
  const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput)
  if (isNaN(date.getTime())) return false
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  return diffDays >= 14
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'none' | 'closing' | 'deleting'>('none')
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('beads-pinned-issues')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [savedViews, setSavedViews] = useState<{ name: string; filters: string }[]>(() => {
    try {
      const saved = localStorage.getItem('beads-saved-views')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showSaveView, setShowSaveView] = useState(false)
  const [newViewName, setNewViewName] = useState('')

  // Persist pinned issues to localStorage
  useEffect(() => {
    localStorage.setItem('beads-pinned-issues', JSON.stringify([...pinnedIds]))
  }, [pinnedIds])

  // Persist saved views to localStorage
  useEffect(() => {
    localStorage.setItem('beads-saved-views', JSON.stringify(savedViews))
  }, [savedViews])

  // Get current filters as a serialized string
  function getCurrentFilters(): string {
    return JSON.stringify({
      sortField,
      sortDirection,
      statusFilter,
      typeFilter,
      priorityFilter,
      assigneeFilter,
      selectedLabels,
      labelMode,
      searchText,
    })
  }

  // Save current view
  function saveCurrentView() {
    if (!newViewName.trim()) return
    const filters = getCurrentFilters()
    setSavedViews(prev => [...prev.filter(v => v.name !== newViewName.trim()), { name: newViewName.trim(), filters }])
    setNewViewName('')
    setShowSaveView(false)
    showToast(`Saved view "${newViewName.trim()}"`, 'success')
  }

  // Load a saved view
  function loadView(filters: string) {
    try {
      const parsed = JSON.parse(filters)
      if (parsed.sortField) setSortField(parsed.sortField)
      if (parsed.sortDirection) setSortDirection(parsed.sortDirection)
      if (parsed.statusFilter !== undefined) setStatusFilter(parsed.statusFilter)
      if (parsed.typeFilter !== undefined) setTypeFilter(parsed.typeFilter)
      if (parsed.priorityFilter !== undefined) setPriorityFilter(parsed.priorityFilter)
      if (parsed.assigneeFilter !== undefined) setAssigneeFilter(parsed.assigneeFilter)
      if (parsed.selectedLabels) setSelectedLabels(parsed.selectedLabels)
      if (parsed.labelMode) setLabelMode(parsed.labelMode)
      if (parsed.searchText !== undefined) setSearchText(parsed.searchText)
    } catch {
      showToast('Failed to load view', 'error')
    }
  }

  // Delete a saved view
  function deleteView(name: string) {
    setSavedViews(prev => prev.filter(v => v.name !== name))
    showToast(`Deleted view "${name}"`, 'success')
  }

  function togglePin(id: string) {
    setPinnedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

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
  // Pinned issues always come first
  const sorted = [...filtered].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id) ? 0 : 1
    const bPinned = pinnedIds.has(b.id) ? 0 : 1
    if (aPinned !== bPinned) return aPinned - bPinned

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

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map(i => i.id)))
    }
  }

  async function handleBulkClose() {
    setBulkAction('closing')
    try {
      for (const id of selectedIds) {
        await onUpdateStatus('update-status', { id, status: 'closed' })
      }
      showToast(`Closed ${selectedIds.size} issues`, 'success')
      setSelectedIds(new Set())
    } catch {
      showToast('Failed to close some issues', 'error')
    } finally {
      setBulkAction('none')
    }
  }

  async function handleBulkDelete() {
    setBulkAction('deleting')
    try {
      for (const id of selectedIds) {
        await onUpdateStatus('delete-issue' as MessageType, { id })
      }
      showToast(`Deleted ${selectedIds.size} issues`, 'success')
      setSelectedIds(new Set())
    } catch {
      showToast('Failed to delete some issues', 'error')
    } finally {
      setBulkAction('none')
    }
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
              setTypeFilter('epic')
              setPriorityFilter('all')
              setAssigneeFilter('all')
              setSelectedLabels([])
            }}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              typeFilter === 'epic'
                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
            title="Show epics with progress"
          >
            Epics
          </button>
          <button
            onClick={() => {
              setStatusFilter('all')
              setTypeFilter('all')
              setPriorityFilter('all')
              setAssigneeFilter('all')
              setSelectedLabels([])
            }}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              statusFilter === 'all' && typeFilter === 'all' && priorityFilter === 'all' && selectedLabels.length === 0
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
            title="Show all issues"
          >
            All
          </button>
          {/* Clear all filters button - shows when any filter is active */}
          {(statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || selectedLabels.length > 0 || searchText) && (
            <button
              onClick={() => {
                setStatusFilter('all')
                setTypeFilter('all')
                setPriorityFilter('all')
                setAssigneeFilter('all')
                setSelectedLabels([])
                setSearchText('')
                setSortField('priority')
                setSortDirection('asc')
              }}
              className="px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
              title="Clear all filters and search"
            >
              Clear
            </button>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-slate-600" />

        {/* Saved Views */}
        <div className="flex items-center gap-1">
          {savedViews.length > 0 && (
            <div className="relative group">
              <button
                className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Views ({savedViews.length})
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 py-1 min-w-[150px] z-10 hidden group-hover:block">
                {savedViews.map(view => (
                  <div
                    key={view.name}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <button
                      onClick={() => loadView(view.filters)}
                      className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {view.name}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteView(view.name)
                      }}
                      className="text-gray-400 hover:text-red-500 ml-2"
                      title="Delete view"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showSaveView ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveCurrentView()
                  else if (e.key === 'Escape') {
                    setShowSaveView(false)
                    setNewViewName('')
                  }
                }}
                placeholder="View name..."
                className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 w-24"
                autoFocus
              />
              <button
                onClick={saveCurrentView}
                disabled={!newViewName.trim()}
                className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveView(false)
                  setNewViewName('')
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveView(true)}
              className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              title="Save current filters as a view"
            >
              + Save View
            </button>
          )}
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

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 flex items-center gap-4">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkClose}
            disabled={bulkAction !== 'none'}
            className="px-3 py-1 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
          >
            {bulkAction === 'closing' ? 'Closing...' : 'Close All'}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkAction !== 'none'}
            className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
          >
            {bulkAction === 'deleting' ? 'Deleting...' : 'Delete All'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700" role="grid" aria-label="Issues list">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === sorted.length && sorted.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500 dark:bg-slate-700"
                  aria-label="Select all issues"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20 hidden sm:table-cell">
                Type
              </th>
              <SortHeader field="priority">Priority</SortHeader>
              <SortHeader field="title">Title</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                Labels
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16 hidden md:table-cell" title="Dependencies">
                Deps
              </th>
              <SortHeader field="status">Status</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('created_at')}>
                  Created
                  {sortField === 'created_at' && (
                    <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('updated_at')}>
                  Updated
                  {sortField === 'updated_at' && (
                    <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('closed_at')}>
                  Closed
                  {sortField === 'closed_at' && (
                    <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {sorted.map((issue, index) => (
              <tr
                key={issue.id}
                className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                  focusedIndex === index ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-500' : ''
                } ${selectedIds.has(issue.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                onClick={() => onIssueClick?.(issue)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(issue.id)}
                    onChange={() => toggleSelect(issue.id)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500 dark:bg-slate-700"
                    aria-label={`Select ${issue.title || issue.id}`}
                  />
                </td>
                <td className="px-4 py-3 text-sm font-mono">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePin(issue.id)
                      }}
                      className={`transition-colors ${
                        pinnedIds.has(issue.id)
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-gray-300 dark:text-gray-600 hover:text-amber-500'
                      }`}
                      title={pinnedIds.has(issue.id) ? 'Unpin issue' : 'Pin issue'}
                      aria-label={pinnedIds.has(issue.id) ? 'Unpin issue' : 'Pin issue'}
                    >
                      📌
                    </button>
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
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
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
                    <div className="flex items-center gap-2">
                      <span
                        className="truncate cursor-text"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          startEditing(issue)
                        }}
                        title="Double-click to edit"
                      >
                        {issue.title || 'Untitled'}
                      </span>
                      {/* Epic indicator with child count */}
                      {issue.issue_type === 'epic' && (issue.dependency_count ?? 0) > 0 && (
                        <span
                          className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                          title={`Epic with ${issue.dependency_count} tasks`}
                        >
                          {issue.dependency_count} tasks
                        </span>
                      )}
                      {issue.status !== 'closed' && isStale(issue.updated_at) && (
                        <span
                          className="flex-shrink-0 text-amber-500 dark:text-amber-400"
                          title="Stale: not updated in 14+ days"
                        >
                          ⏰
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
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
                <td className="px-4 py-3 hidden md:table-cell">
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
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                  {(() => {
                    const { display, full } = formatDate(issue.created_at)
                    return <span title={full}>{display}</span>
                  })()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                  {(() => {
                    const { display, full } = formatDate(issue.updated_at)
                    return <span title={full}>{display}</span>
                  })()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden xl:table-cell">
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
