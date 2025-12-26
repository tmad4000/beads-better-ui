# Beads vs Workflowy: Data Structure Comparison (December 2025)

## The Question

Can beads be presented like Workflowy/Notion with hierarchical nesting, headings, and visual whitespace?

**Answer: Yes.** The data structures are fundamentally similar.

---

## Core Data Models

### Workflowy (OPML)

```xml
<outline text="Project">
  <outline text="Phase 1">
    <outline text="Task A"/>
    <outline text="Task B">
      <outline text="Subtask B.1"/>
      <outline text="Subtask B.2"/>
    </outline>
  </outline>
</outline>
```

- **Node** = `<outline text="...">`
- **Nesting** = XML children
- **Note** = `_note` attribute
- Very simple: text + indent

### Beads (JSONL + Dependencies)

```json
{"id": "bd-epic", "title": "Project", "issue_type": "epic"}
{"id": "bd-task1", "title": "Phase 1", "issue_type": "task"}
{"id": "bd-subtask", "title": "Task A", "issue_type": "task"}
```

Plus dependency links:
```bash
bd dep add bd-task1 bd-epic      # Phase 1 is child of Project
bd dep add bd-subtask bd-task1   # Task A is child of Phase 1
```

- **Node** = Issue (JSON object)
- **Nesting** = Dependency relationships
- **Metadata** = Priority, status, type, labels, etc.

---

## Side-by-Side Comparison

| Aspect | Workflowy | Beads |
|--------|-----------|-------|
| **Core unit** | Bullet | Issue |
| **Nesting mechanism** | DOM children | Dependencies |
| **Unlimited depth?** | ✅ Yes | ✅ Yes (default display: 50 levels) |
| **Multiple parents** | ❌ Strict tree | ✅ DAG (multiple deps) |
| **Sibling ordering** | ✅ Implicit in DOM | ❌ Unordered |
| **Content** | Text + note | Title + description + fields |
| **Metadata** | Tags (#tag), dates | Priority, status, type, labels |
| **Mirrors/references** | ✅ Same bullet multiple places | ✅ One issue, multiple deps |
| **Completion** | ✅ Strikethrough | ✅ Status: closed |
| **Zoom into node** | ✅ Native | ❌ (could build in UI) |

---

## Key Insight: They're Almost Identical

Both are fundamentally:
```
Nodes + Edges = Graph/Tree
```

The difference is vocabulary:
- Workflowy: "parent block" / "child block"
- Beads: "blocked by" / "depends on"

---

## What Beads Adds Over Workflowy

| Feature | Benefit |
|---------|---------|
| **Status tracking** | open, in_progress, blocked, closed |
| **Priority** | P0-P4 with color coding |
| **Type** | bug, feature, task, epic, chore |
| **Labels** | Flexible categorization |
| **`bd ready`** | Auto-find unblocked work |
| **Cycle detection** | Prevents circular dependencies |
| **Git sync** | Version controlled, collaborative |
| **Multiple parents** | One task can block multiple others |

---

## What Workflowy Has That Beads Doesn't (Natively)

| Feature | Notes |
|---------|-------|
| **Sibling ordering** | Beads has no `position` field |
| **Mirrors** | Same node in multiple places |
| **Zoom** | Navigate into any bullet as "root" |
| **Simpler mental model** | Just text and indent |
| **Block types** | Headings, paragraphs, dividers |

---

## Building Workflowy-Style UI for Beads

### What's Possible Now

```
▼ Authentication Epic
    ▼ OAuth Setup
        ○ Google provider
        ○ GitHub provider
    ○ Session management
▼ UI Polish
    ○ Dark mode
    ○ Responsive design
```

Where:
- Nesting = dependency relationship
- Expand/collapse = UI state (stored locally)
- Drag to nest = `bd dep add child parent`
- Indent with Tab = add as child of sibling above

### What You'd Need to Add

1. **Collapsible tree view** - Query `bd dep tree`, render with indentation
2. **Drag-to-reorder** - Modify dependencies on drop
3. **Sibling ordering** - Store in UI config or extend beads schema
4. **Zoom into node** - Filter view to show subtree only

---

## Rendering a Tree from Beads Data

```javascript
// Pseudocode
async function buildTree(rootId) {
  const deps = await bd.dep.tree(rootId, { direction: 'up' });
  return renderNestedList(deps);
}

function renderNestedList(node, depth = 0) {
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <Bullet issue={node} />
      {node.children?.map(child =>
        renderNestedList(child, depth + 1)
      )}
    </div>
  );
}
```

---

## Bottom Line

| | Workflowy | Beads |
|-|-----------|-------|
| **Philosophy** | "Everything is an outline" | "Everything is a task with deps" |
| **Primary view** | Nested bullets | Flat list (tree optional) |
| **Designed for** | Thinking, outlining | Task tracking, dependencies |
| **Power feature** | Zoom/mirror | `bd ready` (unblocked work) |

**Beads can be rendered exactly like Workflowy.** The data supports it. You just build the tree from dependencies instead of from parent_id.

---

## Added to Project Plan

Issue `beads-better-ui-vft`: **Outline/tree view (Workflowy-style)**

Features:
- Nested, collapsible bullets from dependencies
- Expand/collapse nodes
- Status/priority indicators
- Optional: drag-to-reorder, Tab/Shift+Tab for nesting

---

## Sources

- [Workflowy OPML Export](https://blog.workflowy.com/workflowy-now-supports-opml-import-and-export/)
- [Workflowy Exporting Docs](https://workflowy.com/learn/exporting/)
- [Beads dep tree command](https://github.com/steveyegge/beads)
