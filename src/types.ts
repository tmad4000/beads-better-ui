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
  issue_type?: string
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
  | 'create-issue'
  | 'delete-issue'
  | 'label-add'
  | 'label-remove'
  | 'show-issue'
  | 'add-comment'
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
