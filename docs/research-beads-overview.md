# Beads Issue Tracker Research (December 2025)

## What is Beads?

Beads is a distributed, git-backed graph issue tracker designed specifically for AI coding agents. Created by Steve Yegge, it provides persistent, structured memory for agents, replacing messy markdown plans with a dependency-aware graph.

---

## Architecture

### Three-Part Design
1. **Local SQLite Database** (`.beads/beads.db`, gitignored)
   - Fast local queries
   - Holds issues, statuses, priorities, relationships

2. **JSONL Source of Truth** (`.beads/issues.jsonl`, committed)
   - Versioned with git
   - Can be branched and merged like code

3. **Auto-Sync Layer**
   - SQLite → JSONL after CRUD (5-second debounce)
   - JSONL → SQLite when JSONL is newer

### Key Insight
> "Beads issues are backed by git, but through a clever design it manages to act like a managed, centrally hosted SQL database shared by all agents working on a project, even across machines."

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Git-Native** | Issues stored as JSONL, versioned/branched/merged like code |
| **Agent-Optimized** | JSON output, dependency tracking, auto-ready detection |
| **Hash-Based IDs** | `bd-a1b2` format, collision-resistant for multi-agent workflows |
| **Dependency DAG** | Chains issues, detects cycles, visualizes trees |
| **Ready Work Detection** | Finds unblocked issues automatically |
| **No Server Required** | Works offline, no accounts needed |

---

## Integration Options

1. **CLI + Hooks** (recommended for Claude Code, Cursor, Windsurf, Amp)
2. **MCP Server** (`beads-mcp` on PyPI)
3. **Plugin with Slash Commands** (Claude Code)

---

## Community Tools

| Tool | Description |
|------|-------------|
| **beads_viewer** | Keyboard-driven terminal UI with kanban board |
| **beads-ui** | Local web interface with live updates (by @mantoni) |
| **bdui** | Real-time terminal UI with tree view |
| **perles** | Terminal UI with BQL query language |
| **vscode-beads** | VS Code extension with issues panel |
| **Beady** | Web UI for browsing/visualizing beads |

---

## Beads vs Linear Comparison

| Aspect | Beads | Linear |
|--------|-------|--------|
| **Cost** | Free & open source | Paid SaaS |
| **Data Storage** | Git-native (JSONL in repo) | Cloud/proprietary |
| **Target Users** | AI agents | Human teams |
| **Offline Support** | Full | None |
| **Dependencies** | DAG with cycle detection | Basic |
| **Task Detection** | Auto-ready (finds unblocked) | Manual filtering |
| **Vendor Lock-in** | None (it's just git) | Yes |
| **Context Window** | Designed for LLM limits | N/A |
| **Multi-Agent** | Hash IDs prevent collisions | N/A |
| **Integrations** | MCP, CLI, plugins | 100+ (GitHub, Slack, Figma) |
| **Sprint Planning** | No | Yes |
| **Team Collaboration** | Via git | Built-in |

### Key Difference
> "GitHub Issues doesn't work for AI agents. Beads is specifically designed for AI coding agents and their unique context window limitations."

---

## Current Status

- Core features work well
- Expect API changes before 1.0
- Recommended for development/internal projects first

---

## Hosted Server / Slack Integration

**As of December 2025:**
- No centralized hosted server exists (by design - git is the sync layer)
- No native Slack integration
- This is an opportunity for community contribution

---

## Sources

- [GitHub - steveyegge/beads](https://github.com/steveyegge/beads)
- [Beads: A Git-Friendly Issue Tracker | Better Stack](https://betterstack.com/community/guides/ai/beads-issue-tracker-ai-agents/)
- [Introducing Beads | Steve Yegge Medium](https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a)
- [Beads MCP Server](https://mcpmarket.com/server/beads)
- [beads-mcp on PyPI](https://pypi.org/project/beads-mcp/)
