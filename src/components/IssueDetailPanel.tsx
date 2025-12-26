import { useState, useEffect, useCallback } from 'react'
import type { Issue, IssueDetail, MessageType } from '../types'
import { showToast } from './Toast'

interface IssueDetailPanelProps {
  issue: Issue | null
  onClose: () => void
  onUpdate: (type: MessageType, payload?: unknown) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
  onIssueSelect?: (issue: Issue) => void
}

const STATUS_OPTIONS = ['open', 'in_progress', 'blocked', 'closed', 'deferred']
const TYPE_OPTIONS = ['task', 'feature', 'bug', 'epic', 'chore']
const PRIORITY_OPTIONS = [
  { value: 0, label: 'P0 - Critical' },
  { value: 1, label: 'P1 - High' },
  { value: 2, label: 'P2 - Medium' },
  { value: 3, label: 'P3 - Low' },
  { value: 4, label: 'P4 - Minimal' },
]

function formatDate(dateInput?: string): string {
  if (!dateInput) return '-'
  const date = new Date(dateInput)
  return date.toLocaleString()
}

// Format estimate minutes to human-readable string
function formatEstimate(minutes?: number): string {
  if (!minutes || minutes <= 0) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// Parse external ref to get link URL
function getExternalRefLink(ref?: string): { url: string; label: string } | null {
  if (!ref) return null
  const lower = ref.toLowerCase()

  // GitHub: gh-123, github-123, #123
  if (lower.startsWith('gh-') || lower.startsWith('github-')) {
    const num = ref.replace(/^(gh-|github-)/i, '')
    return { url: `https://github.com/issues/${num}`, label: ref }
  }

  // Jira: PROJ-123
  if (/^[A-Z]+-\d+$/.test(ref)) {
    return { url: `#`, label: ref } // Jira URL would need project config
  }

  // URL: https://...
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return { url: ref, label: ref }
  }

  return { url: '#', label: ref }
}

// Format comment timestamp
function formatCommentDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function IssueDetailPanel({ issue, onClose, onUpdate, onDelete, onIssueSelect }: IssueDetailPanelProps) {
  const [newLabel, setNewLabel] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [issueDetail, setIssueDetail] = useState<IssueDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [editingEstimate, setEditingEstimate] = useState(false)
  const [estimateInput, setEstimateInput] = useState('')
  const [editingRef, setEditingRef] = useState(false)
  const [refInput, setRefInput] = useState('')

  // Fetch full issue details when issue changes
  const fetchIssueDetail = useCallback(async () => {
    if (!issue) return
    setLoadingDetail(true)
    try {
      // send() resolves with the payload directly, not wrapped in { payload: ... }
      const result = await onUpdate('show-issue', { id: issue.id }) as IssueDetail | null
      if (result) {
        setIssueDetail(result)
      }
    } catch {
      // Silently fail - we still have basic issue info
    } finally {
      setLoadingDetail(false)
    }
  }, [issue?.id, onUpdate])

  useEffect(() => {
    fetchIssueDetail()
  }, [fetchIssueDetail])

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!issue) return null

  const comments = issueDetail?.comments || []

  async function handleStatusChange(status: string) {
    if (!issue) return
    try {
      await onUpdate('update-status', { id: issue.id, status })
      showToast('Status updated', 'success')
    } catch {
      showToast('Failed to update status', 'error')
    }
  }

  async function handlePriorityChange(priority: number) {
    if (!issue) return
    try {
      await onUpdate('update-priority', { id: issue.id, priority })
      showToast('Priority updated', 'success')
    } catch {
      showToast('Failed to update priority', 'error')
    }
  }

  async function handleTypeChange(type: string) {
    if (!issue) return
    try {
      await onUpdate('update-type', { id: issue.id, type })
      showToast('Type updated', 'success')
    } catch {
      showToast('Failed to update type', 'error')
    }
  }

  async function handleAddLabel() {
    if (!issue) return
    if (!newLabel.trim()) return
    try {
      await onUpdate('label-add', { id: issue.id, label: newLabel.trim() })
      setNewLabel('')
      showToast('Label added', 'success')
    } catch {
      showToast('Failed to add label', 'error')
    }
  }

  async function handleRemoveLabel(label: string) {
    if (!issue) return
    try {
      await onUpdate('label-remove', { id: issue.id, label })
      showToast('Label removed', 'success')
    } catch {
      showToast('Failed to remove label', 'error')
    }
  }

  async function handleDelete() {
    if (!issue) return
    setDeleting(true)
    try {
      await onDelete(issue.id)
      showToast('Issue deleted', 'success')
      onClose()
    } catch {
      showToast('Failed to delete issue', 'error')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  async function copyId() {
    if (!issue) return
    try {
      await navigator.clipboard.writeText(issue.id)
      showToast(`Copied ${issue.id}`, 'success')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  async function handleAddComment() {
    if (!issue) return
    if (!newComment.trim()) return
    setAddingComment(true)
    try {
      // send() resolves with the payload directly
      const result = await onUpdate('add-comment', { id: issue.id, content: newComment.trim() }) as IssueDetail | null
      if (result) {
        setIssueDetail(result)
      }
      setNewComment('')
      showToast('Comment added', 'success')
    } catch {
      showToast('Failed to add comment', 'error')
    } finally {
      setAddingComment(false)
    }
  }

  async function handleEstimateSave() {
    if (!issue) return
    const input = estimateInput.trim()
    let minutes = 0

    if (input) {
      // Parse various formats: "2h", "30m", "2h 30m", "90", "1.5h"
      const hourMatch = input.match(/(\d+(?:\.\d+)?)\s*h/i)
      const minMatch = input.match(/(\d+)\s*m/i)
      const plainNum = input.match(/^(\d+)$/)

      if (hourMatch) minutes += Math.round(parseFloat(hourMatch[1]) * 60)
      if (minMatch) minutes += parseInt(minMatch[1])
      if (plainNum && !hourMatch && !minMatch) minutes = parseInt(plainNum[1])
    }

    try {
      await onUpdate('update-estimate', { id: issue.id, estimate: minutes })
      showToast('Estimate updated', 'success')
    } catch {
      showToast('Failed to update estimate', 'error')
    }
    setEditingEstimate(false)
    setEstimateInput('')
  }

  async function handleExternalRefSave() {
    if (!issue) return
    try {
      await onUpdate('update-external-ref', { id: issue.id, externalRef: refInput.trim() })
      showToast('External ref updated', 'success')
    } catch {
      showToast('Failed to update external ref', 'error')
    }
    setEditingRef(false)
    setRefInput('')
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={copyId}
              className="font-mono text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              title="Click to copy"
            >
              {issue.id}
            </button>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              issue.issue_type === 'bug' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
              issue.issue_type === 'feature' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
              issue.issue_type === 'epic' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' :
              'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
            }`}>
              {issue.issue_type || 'task'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {issue.title || 'Untitled'}
          </h2>

          {/* Status, Priority & Type */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                value={issue.status || 'open'}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Priority
              </label>
              <select
                value={issue.priority ?? 2}
                onChange={(e) => handlePriorityChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Type
              </label>
              <select
                value={issue.issue_type || 'task'}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          {issue.description && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Description
              </label>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-900 rounded-md p-3">
                {issue.description}
              </div>
            </div>
          )}

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Labels
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(issue.labels || []).map(label => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                >
                  {label}
                  <button
                    onClick={() => handleRemoveLabel(label)}
                    className="hover:text-red-600 dark:hover:text-red-400"
                    aria-label={`Remove label ${label}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {(issue.labels || []).length === 0 && (
                <span className="text-sm text-gray-400">No labels</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddLabel()
                  }
                }}
                placeholder="Add label..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleAddLabel}
                disabled={!newLabel.trim()}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Assignee
            </label>
            <div className="text-gray-700 dark:text-gray-300">
              {issue.assignee || <span className="text-gray-400">Unassigned</span>}
            </div>
          </div>

          {/* Estimate */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Estimate
            </label>
            {editingEstimate ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={estimateInput}
                  onChange={(e) => setEstimateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleEstimateSave()
                    } else if (e.key === 'Escape') {
                      setEditingEstimate(false)
                      setEstimateInput('')
                    }
                  }}
                  placeholder="e.g., 2h, 30m, 2h 30m"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
                <button
                  onClick={handleEstimateSave}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingEstimate(false)
                    setEstimateInput('')
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300">
                  {formatEstimate(issue.estimated_minutes)}
                </span>
                <button
                  onClick={() => {
                    setEditingEstimate(true)
                    setEstimateInput(issue.estimated_minutes ? formatEstimate(issue.estimated_minutes) : '')
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* External Ref */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              External Reference
            </label>
            {editingRef ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleExternalRefSave()
                    } else if (e.key === 'Escape') {
                      setEditingRef(false)
                      setRefInput('')
                    }
                  }}
                  placeholder="e.g., gh-123, PROJ-456, https://..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
                <button
                  onClick={handleExternalRefSave}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingRef(false)
                    setRefInput('')
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {issue.external_ref ? (
                  (() => {
                    const link = getExternalRefLink(issue.external_ref)
                    if (link && link.url !== '#') {
                      return (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {link.label}
                        </a>
                      )
                    }
                    return <span className="text-gray-700 dark:text-gray-300">{issue.external_ref}</span>
                  })()
                ) : (
                  <span className="text-gray-400">None</span>
                )}
                <button
                  onClick={() => {
                    setEditingRef(true)
                    setRefInput(issue.external_ref || '')
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Epic Progress */}
          {issue.issue_type === 'epic' && issueDetail?.dependencies && issueDetail.dependencies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Epic Progress
              </label>
              {(() => {
                const total = issueDetail.dependencies.length
                const closed = issueDetail.dependencies.filter(d => d.status === 'closed').length
                const percent = Math.round((closed / total) * 100)
                return (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{closed} of {total} tasks completed</span>
                      <span className={`font-medium ${
                        percent === 100 ? 'text-green-600 dark:text-green-400' :
                        percent > 50 ? 'text-blue-600 dark:text-blue-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>{percent}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          percent === 100 ? 'bg-green-500' :
                          percent > 50 ? 'bg-blue-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Dependencies - What this issue depends on (blocked by) */}
          {issueDetail?.dependencies && issueDetail.dependencies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Blocked By ({issueDetail.dependencies.length})
              </label>
              <div className="space-y-2">
                {issueDetail.dependencies.map(dep => (
                  <div
                    key={dep.id}
                    onClick={() => onIssueSelect?.({ id: dep.id, title: dep.title, status: dep.status as Issue['status'], priority: dep.priority, issue_type: dep.issue_type })}
                    className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      dep.status === 'closed' ? 'bg-green-500' :
                      dep.status === 'blocked' ? 'bg-red-500' :
                      dep.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {dep.id.split('-').pop()}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                      {dep.title || 'Untitled'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      dep.status === 'closed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {dep.status || 'open'}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">→</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependents - What depends on this issue (blocking) */}
          {issueDetail?.dependents && issueDetail.dependents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Blocking ({issueDetail.dependents.length})
              </label>
              <div className="space-y-2">
                {issueDetail.dependents.map(dep => (
                  <div
                    key={dep.id}
                    onClick={() => onIssueSelect?.({ id: dep.id, title: dep.title, status: dep.status as Issue['status'], priority: dep.priority, issue_type: dep.issue_type })}
                    className="flex items-center gap-2 p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-md border border-cyan-200 dark:border-cyan-800 cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      dep.status === 'closed' ? 'bg-green-500' :
                      dep.status === 'blocked' ? 'bg-red-500' :
                      dep.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {dep.id.split('-').pop()}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                      {dep.title || 'Untitled'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      dep.status === 'closed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {dep.status || 'open'}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">→</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-medium text-gray-500 dark:text-gray-400">Created</label>
              <div className="text-gray-700 dark:text-gray-300">{formatDate(issue.created_at)}</div>
            </div>
            <div>
              <label className="block font-medium text-gray-500 dark:text-gray-400">Updated</label>
              <div className="text-gray-700 dark:text-gray-300">{formatDate(issue.updated_at)}</div>
            </div>
            {issue.closed_at && (
              <div>
                <label className="block font-medium text-gray-500 dark:text-gray-400">Closed</label>
                <div className="text-gray-700 dark:text-gray-300">{formatDate(issue.closed_at)}</div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Comments {comments.length > 0 && `(${comments.length})`}
            </label>

            {loadingDetail && comments.length === 0 && (
              <div className="text-sm text-gray-400 dark:text-gray-500 mb-3">Loading...</div>
            )}

            {comments.length > 0 && (
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gray-50 dark:bg-slate-900 rounded-md p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {comment.author || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatCommentDate(comment.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {comments.length === 0 && !loadingDetail && (
              <div className="text-sm text-gray-400 dark:text-gray-500 mb-3">No comments yet</div>
            )}

            {/* Add comment */}
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addingComment}
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 self-end"
                title="Cmd/Ctrl+Enter to submit"
              >
                {addingComment ? '...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
              >
                Delete Issue
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Are you sure?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
