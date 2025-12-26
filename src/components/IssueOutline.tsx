import { useEffect, useMemo, useState } from 'react'
import type { Issue, IssueDetail, MessageType } from '../types'

interface IssueOutlineProps {
  issues: Issue[]
  onUpdate: (type: MessageType, payload?: unknown) => Promise<unknown>
  onIssueClick?: (issue: Issue) => void
}

const STATUS_DOT_COLORS: Record<string, string> = {
  open: 'bg-green-500',
  in_progress: 'bg-blue-500',
  blocked: 'bg-red-500',
  closed: 'bg-purple-500',
  deferred: 'bg-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  blocked: 'Blocked',
  closed: 'Closed',
  deferred: 'Deferred',
}

const PRIORITY_COLORS: Record<number, string> = {
  0: 'bg-red-500 text-white',
  1: 'bg-orange-500 text-white',
  2: 'bg-yellow-500 text-black dark:text-black',
  3: 'bg-blue-500 text-white',
  4: 'bg-gray-400 dark:bg-gray-600 text-white',
}

const TYPE_BADGES: Record<string, string> = {
  bug: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  feature: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  task: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  epic: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  chore: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

function compareIssues(a?: Issue, b?: Issue): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  const priorityDiff = (a.priority ?? 2) - (b.priority ?? 2)
  if (priorityDiff !== 0) return priorityDiff
  const titleA = (a.title || a.id).toLowerCase()
  const titleB = (b.title || b.id).toLowerCase()
  return titleA.localeCompare(titleB)
}

function issueSuffix(id: string): string {
  const parts = id.split('-')
  return parts.length ? parts[parts.length - 1] : id
}

export function IssueOutline({ issues, onUpdate, onIssueClick }: IssueOutlineProps) {
  const [detailById, setDetailById] = useState<Map<string, IssueDetail>>(() => new Map())
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set())
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())

  const issuesById = useMemo(() => {
    const map = new Map<string, Issue>()
    issues.forEach(issue => map.set(issue.id, issue))
    return map
  }, [issues])

  const issuesNeedingDetails = useMemo(() => {
    return issues.filter(issue => (issue.dependency_count ?? 0) > 0)
  }, [issues])

  useEffect(() => {
    let cancelled = false
    const needs = issuesNeedingDetails.filter(issue => {
      const existing = detailById.get(issue.id)
      return !existing || existing.updated_at !== issue.updated_at
    })

    if (needs.length === 0) return

    const queue = [...needs]
    const concurrency = 4

    const worker = async () => {
      while (queue.length > 0 && !cancelled) {
        const nextIssue = queue.shift()
        if (!nextIssue) return
        const issueId = nextIssue.id

        setLoadingIds(prev => {
          const next = new Set(prev)
          next.add(issueId)
          return next
        })

        try {
          const result = await onUpdate('show-issue', { id: issueId }) as IssueDetail | null
          if (!cancelled && result) {
            setDetailById(prev => {
              const next = new Map(prev)
              next.set(issueId, result)
              return next
            })
          }
        } catch {
          // Ignore errors; outline still renders with available data
        } finally {
          if (!cancelled) {
            setLoadingIds(prev => {
              const next = new Set(prev)
              next.delete(issueId)
              return next
            })
          }
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker())
    void Promise.all(workers)

    return () => {
      cancelled = true
    }
  }, [detailById, issuesNeedingDetails, onUpdate])

  const graph = useMemo(() => {
    const childrenByParent = new Map<string, string[]>()
    const roots: string[] = []
    const meta = new Map<string, { extraDeps: string[]; missingDeps: string[]; unresolved: boolean }>()

    issues.forEach(issue => {
      const detail = detailById.get(issue.id)
      const depIds = (detail?.dependencies || []).map(dep => dep.id)
      const inList = depIds.filter(id => issuesById.has(id))
      const missing = depIds.filter(id => !issuesById.has(id))
      const unresolved = !detail && (issue.dependency_count ?? 0) > 0

      meta.set(issue.id, {
        extraDeps: inList.slice(1),
        missingDeps: missing,
        unresolved,
      })

      if (inList.length > 0) {
        const parentId = inList[0]
        const siblings = childrenByParent.get(parentId) || []
        siblings.push(issue.id)
        childrenByParent.set(parentId, siblings)
      } else {
        roots.push(issue.id)
      }
    })

    roots.sort((a, b) => compareIssues(issuesById.get(a), issuesById.get(b)))
    for (const [parent, children] of childrenByParent.entries()) {
      children.sort((a, b) => compareIssues(issuesById.get(a), issuesById.get(b)))
      childrenByParent.set(parent, children)
    }

    return { roots, childrenByParent, meta }
  }, [detailById, issues, issuesById])

  const expandableIds = useMemo(() => {
    const ids = new Set<string>()
    for (const [parent, children] of graph.childrenByParent.entries()) {
      if (children.length > 0) ids.add(parent)
    }
    return ids
  }, [graph.childrenByParent])

  const pendingCount = loadingIds.size
  const expectedCount = issuesNeedingDetails.length
  const loadedCount = issuesNeedingDetails.filter(issue => detailById.has(issue.id)).length

  function toggleCollapse(id: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function collapseAll() {
    setCollapsedIds(new Set(expandableIds))
  }

  function expandAll() {
    setCollapsedIds(new Set())
  }

  function renderNode(id: string, depth: number, path: Set<string>) {
    const issue = issuesById.get(id)
    if (!issue) return null

    const children = graph.childrenByParent.get(id) || []
    const hasChildren = children.length > 0
    const isCollapsed = collapsedIds.has(id)
    const status = issue.status || 'open'
    const priority = issue.priority ?? 2
    const type = issue.issue_type || 'task'
    const meta = graph.meta.get(id)
    const isCycle = path.has(id)

    const row = (
      <div
        key={id}
        className="group"
        style={{ paddingLeft: depth * 20 }}
      >
        <div className="flex items-start gap-2 py-1">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleCollapse(id)
              }}
              className="mt-0.5 w-4 h-4 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label={isCollapsed ? `Expand ${issue.title || issue.id}` : `Collapse ${issue.title || issue.id}`}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span className="mt-0.5 w-4 h-4" />
          )}
          <span className="mt-0.5 text-gray-400">•</span>
          <button
            onClick={() => onIssueClick?.(issue)}
            className="flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span className={`text-sm ${issue.status === 'closed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                {issue.title || 'Untitled'}
              </span>
              <span className="text-xs text-gray-400 font-mono">{issueSuffix(issue.id)}</span>
            </div>
          </button>
          <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${TYPE_BADGES[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            {type}
          </span>
          <span className={`inline-flex w-7 h-6 items-center justify-center text-[11px] font-bold rounded ${PRIORITY_COLORS[priority]}`}>
            P{priority}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[status] || 'bg-gray-400'}`} />
            {STATUS_LABELS[status] || status}
          </span>
          {meta?.extraDeps && meta.extraDeps.length > 0 && (
            <span
              className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
              title={`Also depends on ${meta.extraDeps.join(', ')}`}
            >
              +{meta.extraDeps.length} deps
            </span>
          )}
          {meta?.missingDeps && meta.missingDeps.length > 0 && (
            <span
              className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              title={`Missing dependencies: ${meta.missingDeps.join(', ')}`}
            >
              missing {meta.missingDeps.length}
            </span>
          )}
          {meta?.unresolved && (
            <span className="text-[10px] text-gray-400">loading deps...</span>
          )}
          {isCycle && (
            <span className="text-[10px] text-red-500">cycle</span>
          )}
        </div>
      </div>
    )

    if (isCycle || !hasChildren || isCollapsed) {
      return row
    }

    const nextPath = new Set(path)
    nextPath.add(id)

    return (
      <div key={id}>
        {row}
        {children.map(childId => renderNode(childId, depth + 1, nextPath))}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Collapse all
          </button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {graph.roots.length} roots
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {issues.length} issues
        </div>
        {expectedCount > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            deps {loadedCount}/{expectedCount}{pendingCount > 0 ? ` (${pendingCount} loading)` : ''}
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        {graph.roots.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No issues to outline.</div>
        ) : (
          graph.roots.map(rootId => renderNode(rootId, 0, new Set()))
        )}
      </div>
    </div>
  )
}
