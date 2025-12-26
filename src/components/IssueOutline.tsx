import { useEffect, useMemo, useRef, useState } from 'react'
import type { Issue, IssueDetail, MessageType } from '../types'

interface IssueOutlineProps {
  issues: Issue[]
  onUpdate: (type: MessageType, payload?: unknown) => Promise<unknown>
  onIssueClick?: (issue: Issue) => void
}

type OutlineDirection = 'deps-above' | 'deps-below'

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
  const [direction, setDirection] = useState<OutlineDirection>('deps-below')
  const [detailById, setDetailById] = useState<Map<string, IssueDetail>>(() => new Map())
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set())
  const [collapsedByDirection, setCollapsedByDirection] = useState<Record<OutlineDirection, Set<string>>>(() => ({
    'deps-above': new Set(),
    'deps-below': new Set(),
  }))
  const scrollPositions = useRef<Record<OutlineDirection, number>>({
    'deps-above': 0,
    'deps-below': 0,
  })
  const activeDirection = useRef<OutlineDirection>(direction)

  useEffect(() => {
    activeDirection.current = direction
  }, [direction])

  useEffect(() => {
    function handleScroll() {
      scrollPositions.current[activeDirection.current] = window.scrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const target = scrollPositions.current[direction] ?? 0
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: target, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [direction])

  const issuesById = useMemo(() => {
    const map = new Map<string, Issue>()
    issues.forEach(issue => map.set(issue.id, issue))
    return map
  }, [issues])

  const issuesNeedingDetails = useMemo(() => {
    return issues.filter(issue => (issue.dependency_count ?? 0) > 0 || (issue.dependent_count ?? 0) > 0)
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

  function getRelationCount(issue: Issue, mode: OutlineDirection) {
    return mode === 'deps-above' ? (issue.dependency_count ?? 0) : (issue.dependent_count ?? 0)
  }

  const graph = useMemo(() => {
    const childrenByParent = new Map<string, string[]>()
    const roots: string[] = []
    const meta = new Map<string, { extraLinks: string[]; missingLinks: string[]; unresolved: boolean }>()

    issues.forEach(issue => {
      const detail = detailById.get(issue.id)
      const relations = direction === 'deps-above' ? detail?.dependencies : detail?.dependents
      const relationIds = (relations || []).map(dep => dep.id)
      const inList = relationIds.filter(id => issuesById.has(id))
      const missing = relationIds.filter(id => !issuesById.has(id))
      const unresolved = !detail && getRelationCount(issue, direction) > 0

      meta.set(issue.id, {
        extraLinks: inList.slice(1),
        missingLinks: missing,
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
  }, [detailById, direction, issues, issuesById])

  const expandableIds = useMemo(() => {
    const ids = new Set<string>()
    for (const [parent, children] of graph.childrenByParent.entries()) {
      if (children.length > 0) ids.add(parent)
    }
    return ids
  }, [graph.childrenByParent])

  const modeIssues = useMemo(() => {
    return issues.filter(issue => getRelationCount(issue, direction) > 0)
  }, [direction, issues])

  const pendingCount = modeIssues.filter(issue => loadingIds.has(issue.id)).length
  const expectedCount = modeIssues.length
  const loadedCount = modeIssues.filter(issue => detailById.has(issue.id)).length

  const collapsedIds = collapsedByDirection[direction] || new Set()

  function toggleCollapse(id: string) {
    setCollapsedByDirection(prev => {
      const next = { ...prev }
      const current = new Set(prev[direction] || [])
      if (current.has(id)) current.delete(id)
      else current.add(id)
      next[direction] = current
      return next
    })
  }

  function collapseAll() {
    setCollapsedByDirection(prev => ({
      ...prev,
      [direction]: new Set(expandableIds),
    }))
  }

  function expandAll() {
    setCollapsedByDirection(prev => ({
      ...prev,
      [direction]: new Set(),
    }))
  }

  function switchDirection(next: OutlineDirection) {
    scrollPositions.current[direction] = window.scrollY
    setDirection(next)
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
    const relationLabel = direction === 'deps-above' ? 'dependencies' : 'dependents'

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
          {meta?.extraLinks && meta.extraLinks.length > 0 && (
            <span
              className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
              title={`Also linked to ${meta.extraLinks.join(', ')} (${relationLabel})`}
            >
              +{meta.extraLinks.length} more
            </span>
          )}
          {meta?.missingLinks && meta.missingLinks.length > 0 && (
            <span
              className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              title={`Missing ${relationLabel}: ${meta.missingLinks.join(', ')}`}
            >
              missing {meta.missingLinks.length}
            </span>
          )}
          {meta?.unresolved && (
            <span className="text-[10px] text-gray-400">loading links...</span>
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
        <div className="inline-flex rounded-full border border-gray-200 dark:border-slate-600 overflow-hidden">
          <button
            onClick={() => switchDirection('deps-below')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              direction === 'deps-below'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
            title="Show dependencies below their issues"
          >
            Dependencies below
          </button>
          <button
            onClick={() => switchDirection('deps-above')}
            className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-200 dark:border-slate-600 ${
              direction === 'deps-above'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
            title="Show dependencies above the issues they block"
          >
            Dependencies above
          </button>
        </div>
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
            links {loadedCount}/{expectedCount}{pendingCount > 0 ? ` (${pendingCount} loading)` : ''}
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
