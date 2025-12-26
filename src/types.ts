export interface Issue {
  id: string
  title?: string
  description?: string
  status?: 'open' | 'in_progress' | 'blocked' | 'closed' | 'deferred'
  priority?: number
  issue_type?: string
  assignee?: string
  labels?: string[]
  created_at?: number
  updated_at?: number
  closed_at?: number
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
  | 'edit-text'
  | 'update-priority'
  | 'create-issue'
  | 'label-add'
  | 'label-remove'
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
