/**
 * File loading utilities for MarkTree (.mt) and JSONL files
 * Converts external file formats to the internal Issue interface
 */

import type { Issue } from './types'

interface MarkTreeNode {
  id: string
  text: string
  children: string[]
  parent: string | null
  isCollapsed?: boolean
  metadata?: {
    note?: string
    attributes?: Record<string, string | number | undefined>
  }
}

type MarkTreeDocument = Record<string, MarkTreeNode>

interface BeadsIssue {
  id: string
  title?: string
  description?: string
  status?: string
  priority?: number
  issue_type?: string
  labels?: string[]
  created_at?: string
  updated_at?: string
  closed_at?: string
  parent_id?: string
  assignee?: string
  estimated_minutes?: number
  external_ref?: string
}

/**
 * Convert MarkTree (.mt) JSON to Issue array
 */
export function markTreeToIssues(content: string): Issue[] {
  const tree: MarkTreeDocument = JSON.parse(content)

  return Object.values(tree)
    .filter(node => {
      // Skip root nodes and nodes without issue-like attributes
      if (node.parent === null) return false
      const attrs = node.metadata?.attributes
      return attrs?.id || attrs?.status || attrs?.type
    })
    .map(node => {
      const attrs = node.metadata?.attributes || {}

      // Extract title from text (remove ID prefix like "GEMI-001: ")
      const title = node.text.replace(/^[A-Z]+-\d+:\s*/, '')

      // Convert priority string to number
      let priority: number | undefined
      if (attrs.priority) {
        const p = String(attrs.priority).toLowerCase()
        if (p === 'critical') priority = 0
        else if (p === 'high') priority = 1
        else if (p === 'medium') priority = 2
        else if (p === 'low') priority = 3
        else priority = parseInt(p) || 2
      }

      // Convert labels string to array
      let labels: string[] | undefined
      if (attrs.labels) {
        labels = String(attrs.labels).split(',').map(l => l.trim()).filter(Boolean)
      }

      return {
        id: String(attrs.id || node.id),
        title,
        description: node.metadata?.note,
        status: attrs.status as Issue['status'],
        priority,
        issue_type: attrs.type ? String(attrs.type) : undefined,
        labels,
        created_at: attrs.created ? String(attrs.created) : undefined,
        updated_at: attrs.updated ? String(attrs.updated) : undefined,
        closed_at: attrs.closed ? String(attrs.closed) : undefined,
        assignee: attrs.assignee ? String(attrs.assignee) : undefined,
        estimated_minutes: attrs.estimated_minutes ? Number(attrs.estimated_minutes) : undefined,
        external_ref: attrs.external_ref ? String(attrs.external_ref) : undefined,
      }
    })
}

/**
 * Convert Beads JSONL to Issue array
 */
export function jsonlToIssues(content: string): Issue[] {
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const beads: BeadsIssue = JSON.parse(line)
      return {
        id: beads.id,
        title: beads.title,
        description: beads.description,
        status: beads.status as Issue['status'],
        priority: beads.priority,
        issue_type: beads.issue_type,
        labels: beads.labels,
        created_at: beads.created_at,
        updated_at: beads.updated_at,
        closed_at: beads.closed_at,
        assignee: beads.assignee,
        estimated_minutes: beads.estimated_minutes,
        external_ref: beads.external_ref,
      }
    })
}

/**
 * Convert plain JSON (array of issues or MarkTree format) to Issue array
 */
export function jsonToIssues(content: string): Issue[] {
  const data = JSON.parse(content)

  // If it's an array, assume it's already Issue[]
  if (Array.isArray(data)) {
    return data as Issue[]
  }

  // Otherwise, treat as MarkTree format
  return markTreeToIssues(content)
}

/**
 * Auto-detect file format and convert to Issue array
 */
export function loadFile(content: string, filename: string): Issue[] {
  const ext = filename.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'mt':
      return markTreeToIssues(content)
    case 'jsonl':
      return jsonlToIssues(content)
    case 'json':
      return jsonToIssues(content)
    default:
      // Try to auto-detect
      if (content.trim().startsWith('{') && content.includes('"children"')) {
        return markTreeToIssues(content)
      } else if (content.includes('\n') && content.trim().startsWith('{')) {
        return jsonlToIssues(content)
      }
      return jsonToIssues(content)
  }
}

/**
 * Export Issues to JSONL format
 */
export function issuesToJsonl(issues: Issue[]): string {
  return issues.map(issue => JSON.stringify(issue)).join('\n')
}

/**
 * Export Issues to MarkTree format
 */
export function issuesToMarkTree(issues: Issue[]): string {
  const tree: MarkTreeDocument = {
    root: {
      id: 'root',
      text: 'Issues',
      children: issues.map(i => i.id),
      parent: null,
      metadata: {
        attributes: {
          view: 'table',
          columns: 'id, status, priority, issue_type'
        }
      }
    }
  }

  for (const issue of issues) {
    // Convert priority number to string
    let priority: string | undefined
    if (issue.priority !== undefined) {
      if (issue.priority === 0) priority = 'critical'
      else if (issue.priority === 1) priority = 'high'
      else if (issue.priority === 2) priority = 'medium'
      else if (issue.priority === 3) priority = 'low'
      else priority = String(issue.priority)
    }

    tree[issue.id] = {
      id: issue.id,
      text: `${issue.id}: ${issue.title || 'Untitled'}`,
      children: [],
      parent: 'root',
      metadata: {
        note: issue.description,
        attributes: {
          id: issue.id,
          status: issue.status,
          priority,
          type: issue.issue_type,
          labels: issue.labels?.join(', '),
          created: issue.created_at,
          updated: issue.updated_at,
          closed: issue.closed_at,
          assignee: issue.assignee,
          estimated_minutes: issue.estimated_minutes,
          external_ref: issue.external_ref,
        }
      }
    }
  }

  return JSON.stringify(tree, null, 2)
}
