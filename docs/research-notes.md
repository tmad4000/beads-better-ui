# Research Notes

## beads-ui Source Code Analysis

**Source cloned to**: `~/code/beads-ui-source`
**GitHub**: https://github.com/mantoni/beads-ui

### Directory Structure
```
app/
├── main.js           # Bootstrap, WebSocket setup, routing (26KB)
├── protocol.js       # WebSocket message types and helpers
├── router.js         # Hash-based routing
├── state.js          # Simple state store
├── styles.css        # All CSS (42KB)
├── ws.js             # WebSocket client wrapper
├── data/
│   ├── list-selectors.js      # Derived data selectors
│   ├── providers.js           # Data layer factory
│   ├── sort.js                # Sort comparators
│   ├── subscription-issue-store.js
│   └── subscriptions-store.js
├── utils/
│   ├── activity-indicator.js
│   ├── issue-id-renderer.js
│   ├── issue-type.js
│   ├── issue-url.js
│   ├── logging.js
│   ├── markdown.js
│   ├── priority-badge.js
│   ├── priority.js
│   ├── status-badge.js
│   ├── status.js
│   ├── toast.js
│   └── type-badge.js
└── views/
    ├── board.js          # Kanban board (17KB)
    ├── detail.js         # Issue detail panel (44KB - largest!)
    ├── epics.js          # Epics view (9KB)
    ├── fatal-error-dialog.js
    ├── issue-dialog.js
    ├── issue-row.js      # Table row renderer
    ├── list.js           # Issues list view (16KB)
    ├── nav.js            # Top navigation
    └── new-issue-dialog.js

server/
├── app.js            # Express app setup
├── bd.js             # bd CLI wrapper (165 lines)
├── config.js         # Server config
├── db.js             # Database path resolution
├── index.js          # Server entry point
├── list-adapters.js  # Query builders for different views
├── logging.js        # Debug logging
├── subscriptions.js  # Subscription registry
├── validators.js     # Input validation
├── watcher.js        # File system watcher
├── ws.js             # WebSocket handler (1082 lines)
└── cli/
    ├── commands.js
    ├── daemon.js
    ├── index.js
    ├── open.js
    └── usage.js
```

### WebSocket Protocol

Message types defined in `app/protocol.js`:
```javascript
const MESSAGE_TYPES = [
  'list-issues',
  'update-status',
  'edit-text',
  'update-priority',
  'create-issue',
  'list-ready',
  'dep-add',
  'dep-remove',
  'epic-status',
  'update-assignee',
  'label-add',
  'label-remove',
  'subscribe-list',
  'unsubscribe-list',
  'snapshot',      // Push: full list refresh
  'upsert',        // Push: single issue update
  'delete',        // Push: issue deleted
  'get-comments',
  'add-comment',
  'delete-issue'
];
```

### Issue Data Shape

From `views/list.js` and `views/detail.js`:
```typescript
interface Issue {
  id: string;
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'blocked' | 'closed';
  priority?: number;  // 0-4
  issue_type?: string;
  assignee?: string;
  labels?: string[];
  created_at?: number;
  updated_at?: number;
  closed_at?: number;
}

interface IssueDetail extends Issue {
  acceptance?: string;
  notes?: string;
  design?: string;
  dependencies?: Dependency[];
  dependents?: Dependency[];
  comments?: Comment[];
}

interface Dependency {
  id: string;
  title?: string;
  issue_type?: string;
}
```

### Sort Functions

From `data/sort.js`:
```javascript
// Primary sort: priority ascending, then created_at ascending
function cmpPriorityThenCreated(a, b) { ... }

// For closed issues: closed_at descending
function cmpClosedDesc(a, b) { ... }
```

**Note**: No UI controls for choosing sort field - it's hardcoded.

### Labels Gap

In `views/issue-row.js`, the row template renders:
1. ID
2. Type badge
3. Title (editable)
4. Status (select)
5. Assignee (editable)
6. Priority (select)

**Labels are NOT rendered** even though the data includes them.

### bd CLI Wrapper

From `server/bd.js`:
```javascript
// Spawn bd with args, return stdout/stderr
function runBd(args, options) {
  const child = spawn(bin, args, { shell: false });
  // ...
}

// Parse JSON output
async function runBdJson(args, options) {
  const result = await runBd(args, options);
  return { code: 0, stdoutJson: JSON.parse(result.stdout) };
}
```

Very clean pattern we can reuse.

---

## beads CLI Capabilities

### Dependency Types

From `bd dep add --help` and `bd create --help`:
- `blocks` - A blocks B (A must complete before B)
- `related` - Bidirectional relationship
- `parent-child` - Hierarchical (via `--parent`)
- `discovered-from` - Issue discovered while working on another
- `waits-for` - Fanout gate pattern

### Graph Visualization

```bash
$ bd graph <issue-id>
```
Outputs ASCII art showing dependency tree with:
- Left-to-right execution order
- Color-coded status (white=open, yellow=in_progress, red=blocked, green=closed)
- Parallel tracks for independent work

### Ready Work Detection

```bash
$ bd ready
```
Shows issues that:
- Status is open or in_progress
- Have no open blocking dependencies

### Available Sort Fields

```bash
$ bd list --sort <field>
```
Fields: priority, created, updated, closed, status, id, title, type, assignee

### Date Filtering

```bash
$ bd list --created-after 2025-01-01 --created-before 2025-12-31
$ bd list --updated-after 2025-12-01
$ bd list --closed-after 2025-12-20
```

---

## Linear Feature Comparison

Source: https://linear.app/features

### What Linear Has That Beads Doesn't
- Cycles (time-boxed sprints)
- Roadmaps (timeline view)
- Projects (as containers separate from issues)
- Team workspaces
- Triage inbox
- Analytics/Insights
- SLA tracking
- AI-powered search
- Notifications
- Custom fields

### What Beads Has That's Unique
- Git-backed storage (distributed, version-controlled)
- First-class dependency graph
- AI-agent optimized (JSON output, MCP integration)
- Local-first (no server required)
- Semantic compaction (memory decay for old issues)

---

## Other Beads UIs

### beads_viewer (Terminal)
https://github.com/Dicklesworthstone/beads_viewer

Features we could learn from:
- Graph metrics (PageRank, Betweenness, Critical Path)
- Insights dashboard
- History view correlating git commits with tasks
- Export to Mermaid diagrams

### VS Code Extension
https://github.com/mantoni/vscode-beads (assumed, not verified)

---

## Technical Decisions Log

### 2025-12-25: Choose React over lit-html

**Decision**: Use React + TypeScript instead of lit-html

**Rationale**:
- Better component composition
- Larger ecosystem (UI libraries, tools)
- TypeScript-first
- Familiar to more developers
- Better devtools

**Trade-offs**:
- Larger bundle size
- More build complexity
- Different mental model than existing beads-ui

### 2025-12-25: Reuse server pattern

**Decision**: Base server on beads-ui's approach (Express + WS + bd CLI spawn)

**Rationale**:
- Proven to work
- Clean separation
- bd CLI handles all data operations
- No need to understand beads internals
