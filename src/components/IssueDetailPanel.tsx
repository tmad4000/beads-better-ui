import { useState, useEffect } from 'react'
import type { Issue } from '../types'
import { showToast } from './Toast'

interface IssueDetailPanelProps {
  issue: Issue | null
  onClose: () => void
  onUpdate: (type: string, payload: unknown) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
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

export function IssueDetailPanel({ issue, onClose, onUpdate, onDelete }: IssueDetailPanelProps) {
  const [newLabel, setNewLabel] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!issue) return null

  async function handleStatusChange(status: string) {
    try {
      await onUpdate('update-status', { id: issue.id, status })
      showToast('Status updated', 'success')
    } catch {
      showToast('Failed to update status', 'error')
    }
  }

  async function handlePriorityChange(priority: number) {
    try {
      await onUpdate('update-priority', { id: issue.id, priority })
      showToast('Priority updated', 'success')
    } catch {
      showToast('Failed to update priority', 'error')
    }
  }

  async function handleAddLabel() {
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
    try {
      await onUpdate('label-remove', { id: issue.id, label })
      showToast('Label removed', 'success')
    } catch {
      showToast('Failed to remove label', 'error')
    }
  }

  async function handleDelete() {
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
    try {
      await navigator.clipboard.writeText(issue.id)
      showToast(`Copied ${issue.id}`, 'success')
    } catch {
      showToast('Failed to copy', 'error')
    }
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

          {/* Status & Priority */}
          <div className="flex gap-4">
            <div className="flex-1">
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
            <div className="flex-1">
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

          {/* Dependencies */}
          {(issue.dependency_count !== undefined && issue.dependency_count > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Dependencies
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {issue.dependency_count} dependencies
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
