import { useState } from 'react'
import type { Issue, MessageType } from '../types'

interface IssueListProps {
  issues: Issue[]
  onUpdateStatus: (type: MessageType, payload?: unknown) => Promise<unknown>
}

type SortField = 'priority' | 'created_at' | 'updated_at' | 'closed_at' | 'title' | 'status'
type SortDirection = 'asc' | 'desc'

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  closed: 'bg-purple-100 text-purple-800',
  deferred: 'bg-gray-100 text-gray-800',
}

const PRIORITY_COLORS: Record<number, string> = {
  0: 'bg-red-500 text-white',
  1: 'bg-orange-500 text-white',
  2: 'bg-yellow-500 text-black',
  3: 'bg-blue-500 text-white',
  4: 'bg-gray-400 text-white',
}

const TYPE_ICONS: Record<string, string> = {
  bug: 'bg-red-100 text-red-700',
  feature: 'bg-green-100 text-green-700',
  task: 'bg-yellow-100 text-yellow-700',
  epic: 'bg-orange-100 text-orange-700',
  chore: 'bg-gray-100 text-gray-700',
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString()
}

export function IssueList({ issues, onUpdateStatus }: IssueListProps) {
  const [sortField, setSortField] = useState<SortField>('priority')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [labelFilter, setLabelFilter] = useState<string>('')

  // Get all unique labels
  const allLabels = Array.from(
    new Set(issues.flatMap(i => i.labels || []))
  ).sort()

  // Filter issues
  let filtered = issues
  if (statusFilter !== 'all') {
    filtered = filtered.filter(i => i.status === statusFilter)
  }
  if (labelFilter) {
    filtered = filtered.filter(i => i.labels?.includes(labelFilter))
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
        aVal = a.created_at ?? 0
        bVal = b.created_at ?? 0
        break
      case 'updated_at':
        aVal = a.updated_at ?? 0
        bVal = b.updated_at ?? 0
        break
      case 'closed_at':
        aVal = a.closed_at ?? 0
        bVal = b.closed_at ?? 0
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
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && (
            <span className="text-gray-400">
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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
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
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Label:</label>
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">All</option>
              {allLabels.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto text-sm text-gray-500">
          {sorted.length} of {issues.length} issues
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Type
              </th>
              <SortHeader field="priority">Priority</SortHeader>
              <SortHeader field="title">Title</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Labels
              </th>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="created_at">Created</SortHeader>
              <SortHeader field="updated_at">Updated</SortHeader>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-500">
                  {issue.id.split('-').pop()}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${TYPE_ICONS[issue.issue_type || ''] || 'bg-gray-100 text-gray-700'}`}>
                    {issue.issue_type || 'task'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex w-6 h-6 items-center justify-center text-xs font-bold rounded ${PRIORITY_COLORS[issue.priority ?? 2]}`}>
                    P{issue.priority ?? 2}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                  {issue.title || 'Untitled'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(issue.labels || []).map(label => (
                      <span
                        key={label}
                        className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-700"
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
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDate(issue.created_at)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDate(issue.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
