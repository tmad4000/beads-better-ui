export interface Issue {
  id: string
  title?: string
  description?: string
  status?: 'open' | 'in_progress' | 'blocked' | 'closed' | 'deferred'
  priority?: number
  issue_type?: string
  assignee?: string
  labels?: string[]
  created_at?: string  // ISO 8601 format
  updated_at?: string  // ISO 8601 format
  closed_at?: string   // ISO 8601 format
  dependency_count?: number
  dependent_count?: number
  estimated_minutes?: number  // Time estimate in minutes
  external_ref?: string       // External reference (e.g., 'gh-123', 'jira-ABC')
}

export interface IssueDetail extends Issue {
  acceptance?: string
  notes?: string
  design?: string
  dependencies?: Dependency[]
  dependents?: Dependency[]
  comments?: Comment[]
}

export interface Dependency {
  id: string
  title?: string
  status?: string
  priority?: number
  issue_type?: string
  dependency_type?: 'blocks' | 'relates_to'
}

export interface Comment {
  id: string
  author: string
  content: string
  created_at: number
}

export type MessageType =
  | 'list-issues'
  | 'update-status'
  | 'update-priority'
  | 'update-title'
  | 'update-type'
  | 'update-estimate'
  | 'update-external-ref'
  | 'create-issue'
  | 'delete-issue'
  | 'label-add'
  | 'label-remove'
  | 'show-issue'
  | 'add-comment'
  | 'get-seen'
  | 'mark-seen'
  | 'mark-unseen'
  | 'get-project-info'
  | 'open-in-finder'
  | 'snapshot'
  | 'upsert'
  | 'delete'

export interface RequestEnvelope {
  id: string
  type: MessageType
  payload?: unknown
}

export interface ReplyEnvelope {
  id: string
  ok: boolean
  type: MessageType
  payload?: unknown
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
