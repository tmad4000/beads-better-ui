import { useMemo, useState } from 'react'
import { showToast } from './Toast'
import type { Issue } from '../types'

interface NewIssueDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (issue: NewIssueData) => Promise<void>
  issues: Issue[]
}

export interface NewIssueData {
  title: string
  description: string
  type: string
  priority: number
  labels: string[]
  parentId?: string
}

const ISSUE_TYPES = ['task', 'feature', 'bug', 'epic', 'chore']

export function NewIssueDialog({ isOpen, onClose, onSubmit, issues }: NewIssueDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('task')
  const [priority, setPriority] = useState(2)
  const [labelsInput, setLabelsInput] = useState('')
  const [parentId, setParentId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const parentOptions = useMemo(() => {
    return [...issues]
      .sort((a, b) => {
        const rankA = a.issue_type === 'epic' ? 0 : 1
        const rankB = b.issue_type === 'epic' ? 0 : 1
        if (rankA !== rankB) return rankA - rankB
        const titleA = (a.title || a.id).toLowerCase()
        const titleB = (b.title || b.id).toLowerCase()
        return titleA.localeCompare(titleB)
      })
  }, [issues])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    setSubmitting(true)
    try {
      const labels = labelsInput
        .split(',')
        .map(l => l.trim())
        .filter(Boolean)

      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        labels,
        parentId: parentId || undefined,
      })

      // Reset form
      setTitle('')
      setDescription('')
      setType('task')
      setPriority(2)
      setLabelsInput('')
      setParentId('')
      onClose()
      showToast('Issue created', 'success')
    } catch {
      showToast('Failed to create issue', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              New Issue
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Issue title"
                autoFocus
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  {ISSUE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  <option value={0}>P0 - Critical</option>
                  <option value={1}>P1 - High</option>
                  <option value={2}>P2 - Medium</option>
                  <option value={3}>P3 - Low</option>
                  <option value={4}>P4 - Minimal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Describe the issue..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Labels
              </label>
              <input
                type="text"
                value={labelsInput}
                onChange={(e) => setLabelsInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Comma-separated labels"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parent (optional)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">None</option>
                {parentOptions.map(issue => (
                  <option key={issue.id} value={issue.id}>
                    {issue.issue_type === 'epic' ? 'Epic' : issue.issue_type || 'Task'} · {issue.title || issue.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
