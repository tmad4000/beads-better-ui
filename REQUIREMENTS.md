# Beads Better UI - Product Requirements Document

## Overview

A modern, intuitive web interface for the [Beads](https://github.com/steveyegge/beads) issue tracker. Beads is a git-backed, graph-based issue tracker designed for AI coding agents with first-class dependency support.

**Goal**: Build a better UI than the existing [beads-ui](https://github.com/mantoni/beads-ui) with improved UX, better feature coverage, and modern design.

---

## Research & Analysis

### Existing beads-ui Analysis

**Repository**: https://github.com/mantoni/beads-ui
**Version reviewed**: 0.8.0 (Dec 2025)
**Tech stack**: lit-html, vanilla JS, plain CSS, Express + WebSocket

#### What beads-ui Does Well
- WebSocket protocol is clean and well-defined (`protocol.js`)
- Real-time updates via push subscriptions
- `bd` CLI wrapper is simple (~165 lines in `bd.js`)
- Kanban board view with drag-and-drop
- Inline editing of title/assignee
- Comments support (added in v0.7.0)

#### What beads-ui Lacks
| Gap | Impact |
|-----|--------|
| Labels not visible in list view | Can't see labels at a glance |
| No label filtering | Can't filter by label |
| No date sorting in UI | CLI supports `--sort created/updated/closed` but UI doesn't |
| No project name in title/header | Confusing with multiple projects |
| No dependency graph visualization | Core beads feature not surfaced |
| No "ready to work" view | `bd ready` not exposed in UI |
| No estimates display | CLI supports but UI ignores |
| No external refs display | GitHub/Jira links not shown |
| No pinned issues | CLI supports but UI ignores |
| No saved filter views | Must re-apply filters each time |

### Beads CLI Feature Coverage

Full list of beads CLI capabilities to consider exposing:

#### Core Issue Management
- [x] Create/edit/delete issues
- [x] Status management (open, in_progress, blocked, closed, deferred)
- [x] Priority levels (P0-P4)
- [x] Issue types (bug, feature, task, epic, chore, merge-request)
- [x] Assignees
- [x] Labels (add/remove)
- [x] Comments
- [ ] Estimates (`--estimate`)
- [ ] Acceptance criteria
- [ ] Design notes
- [ ] External references (`--external-ref`)

#### Dependencies (Beads' Core Differentiator)
- [x] Add/remove dependencies
- [ ] Dependency types: blocks, related, parent-child, discovered-from, waits-for
- [ ] Dependency graph visualization (`bd graph`)
- [ ] Cycle detection (`bd dep cycles`)
- [ ] Ready work queue (`bd ready`)
- [ ] Blocked issues view (`bd blocked`)

#### Organization
- [x] Epics with progress tracking
- [ ] Parent/child hierarchy (`--parent`)
- [ ] Pinned issues (`bd pin`)
- [ ] Stale issue detection (`bd stale`)
- [ ] Duplicate detection (`bd duplicates`)

#### Filtering & Sorting
- [x] Status filter
- [x] Type filter
- [x] Text search
- [ ] Label filter (AND/OR modes)
- [ ] Assignee filter
- [ ] Priority filter
- [ ] Date range filters (created, updated, closed)
- [ ] Sort by any field (priority, created, updated, closed, title, assignee)
- [ ] Saved filter views

### Linear Comparison

Features from [Linear](https://linear.app/features) that could inspire improvements:

| Linear Feature | Relevance to Beads Better UI |
|----------------|------------------------------|
| Cycles/Sprints | Out of scope - beads doesn't support |
| Roadmaps | Could build on dependency graph |
| Triage inbox | Could filter by "needs triage" label |
| Saved views | High value - persist filter state |
| Keyboard shortcuts | Essential for power users |
| AI search | Out of scope initially |
| Analytics | Could show velocity/burndown |

---

## Technical Decisions

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: React Query or Zustand
- **WebSocket**: Native WebSocket API
- **Backend**: Reuse beads-ui server pattern (Express + WS + bd CLI)

### Architecture
```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  ┌───────────────────────────────────────────────┐  │
│  │              React Application                │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │  │
│  │  │ListView │ │BoardView│ │ GraphView (new) │  │  │
│  │  └─────────┘ └─────────┘ └─────────────────┘  │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │          WebSocket Client               │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────┐
│                   Node.js Server                    │
│  ┌─────────────────────────────────────────────┐    │
│  │            WebSocket Handler                │    │
│  └─────────────────────────────────────────────┘    │
│                         │                           │
│                         ▼                           │
│  ┌─────────────────────────────────────────────┐    │
│  │         bd CLI Wrapper (spawn)              │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  bd CLI       │
                 │  (beads)      │
                 └───────────────┘
```

---

## Feature Phases

### Phase 1: Core Parity + Quick Wins (P0-P1)
Essential features to match beads-ui plus immediate improvements.

- [ ] Project setup (React + TypeScript + Vite + Tailwind)
- [ ] WebSocket server communicating with bd CLI
- [ ] **Project name in page title and header**
- [ ] Issues list view with sortable columns
- [ ] **Sort by date: created, updated, closed**
- [ ] **Labels visible in list view**
- [ ] **Label filtering**
- [ ] Status filter
- [ ] Text search
- [ ] Issue detail panel/modal
- [ ] Create new issue form
- [ ] Close and reopen issues
- [ ] Label management (add/remove)
- [ ] Real-time updates via WebSocket
- [ ] Loading states and error handling

### Phase 2: Enhanced UX (P2)
Better experience and more beads features.

- [ ] Kanban board view
- [ ] Keyboard navigation (j/k, arrows, Enter, Esc)
- [ ] Priority filter and visual indicators
- [ ] Type filter
- [ ] Assignee filter
- [ ] Inline editing of issue fields
- [ ] Comments view and add
- [ ] Dependencies visualization (list view)
- [ ] Epics view with progress tracking
- [ ] Delete issues with confirmation
- [ ] Persistent filter state in URL

### Phase 3: Graph & Advanced (P3)
Unique value-add features leveraging beads' graph nature.

- [ ] **Dependency graph visualization** (interactive)
- [ ] **"Ready to work" view** (issues with no open blockers)
- [ ] **Blocked issues view**
- [ ] **Critical path highlighting**
- [ ] Cycle detection warnings
- [ ] Estimates display and editing
- [ ] External refs display (GitHub, Jira links)
- [ ] Pinned issues
- [ ] Stale issues indicator
- [ ] Saved filter views
- [ ] Dark mode
- [ ] Bulk actions
- [ ] Responsive mobile design

---

## UI/UX Principles

1. **Show project context** - Always display which project you're viewing
2. **Labels are first-class** - Visible everywhere, easy to filter
3. **Dates matter** - Sort and filter by created/updated/closed
4. **Leverage the graph** - Dependencies are beads' superpower, surface them
5. **Keyboard-first** - Full keyboard navigation for power users
6. **Fast** - Minimal latency, optimistic updates
7. **Clean** - Modern design, not cluttered

---

## Reference Links

- [Beads CLI](https://github.com/steveyegge/beads) - The underlying issue tracker
- [beads-ui](https://github.com/mantoni/beads-ui) - Existing UI (MIT license)
- [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) - Terminal UI with graph metrics
- [Linear](https://linear.app/features) - Design inspiration
- [@beads/bd on npm](https://www.npmjs.com/package/@beads/bd) - CLI package

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-25 | Initial PRD created from research session |
