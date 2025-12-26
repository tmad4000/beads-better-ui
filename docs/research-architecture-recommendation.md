# Architecture Recommendation: Git as Server (December 2025)

## The Question

Given all the research on AI coding agents, Slack integrations, and beads, should we build a cloud-based Beads UI as a central server that various things submit to?

**Answer: No.** Git is already the server. Build a great local UI instead.

---

## Beads' Philosophy

Beads was designed with git as the sync layer:

```
           ┌─────────────┐
           │   GitHub    │  ← The "central server"
           │  (git repo) │
           └──────┬──────┘
                  │ git sync
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌───▼───┐    ┌───▼───┐
│ Dev A │    │ Dev B │    │ Slack │
│ local │    │ local │    │  bot  │
│ beads │    │ beads │    │ beads │
└───────┘    └───────┘    └───────┘
```

The JSONL files in `.beads/` are committed to git. Every client syncs through git. There's no need for a custom central server.

---

## Recommended Architecture

```
┌─────────────────────────────────────────────┐
│                   GitHub                     │
│              (source of truth)               │
└─────────────────┬───────────────────────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│ Claude  │  │  Local  │  │  Local  │
│ Code    │  │  Web UI │  │   CLI   │
│ Slack   │  │(better- │  │  (bd)   │
│  Bot    │  │   ui)   │  │         │
└────┬────┘  └─────────┘  └─────────┘
     │
     │ Uses Claude Code SDK
     │ + beads MCP server
     │
     ▼
  Commits to git automatically
```

---

## What to Build vs. What to Use

### Don't Build (Already Solved)

| Thing | Why Not | Use Instead |
|-------|---------|-------------|
| Central beads server | Git already does this | GitHub/GitLab |
| Custom AI agent | Claude Code is optimized | Claude Code SDK |
| Custom Slack bot from scratch | Reinventing the wheel | mpociot/claude-code-slack-bot |
| Mom-like agent | Rebuilds Claude Code poorly | Claude Code + MCP |

### Do Build

| Thing | Why |
|-------|-----|
| **beads-better-ui** | Nice local web interface with modern UX |
| **Workflowy-style tree view** | Novel visualization of dependencies |
| **Read-only hosted dashboard** | Only if non-dev stakeholders need visibility |

---

## Slack Integration Path

Use **mpociot/claude-code-slack-bot** with beads MCP server:

```
Slack message: "@Claude create a task for fixing the login bug"
       ↓
claude-code-slack-bot (wraps Claude Code SDK)
       ↓
Claude Code with beads MCP server
       ↓
bd create "Fix login bug" --type bug
       ↓
Auto-commits to git
       ↓
Responds in Slack with issue ID
```

**Benefits:**
- Uses actual Claude Code (optimized, high SWE-bench scores)
- MCP support built-in
- No custom agent code to maintain
- Git sync handled automatically

**Setup:**
1. Fork mpociot/claude-code-slack-bot
2. Add beads MCP server to config:
   ```json
   {
     "mcpServers": {
       "beads": { "command": "beads-mcp" }
     }
   }
   ```
3. Deploy (Railway, Fly.io, etc.)

---

## When You WOULD Need a Hosted UI

| Scenario | Solution |
|----------|----------|
| Non-dev stakeholders need visibility | Read-only dashboard pulling from git |
| Mobile access without repo | Hosted read-only view |
| Public issue tracker | GitHub Issues mirror (beads has integration) |

For dev teams where everyone has repo access, local UI is sufficient and simpler.

---

## Key Insights from Research

### On AI Agents
- Claude Code is highly optimized (72%+ SWE-bench)
- Claude Agent SDK powers Claude Code but is proprietary
- OpenCode is the open-source alternative with MCP support
- Don't rebuild what Claude Code already does well

### On Beads Architecture
- Git is the distributed database
- SQLite is just a local cache
- JSONL is the source of truth
- No server needed - git IS the server

### On Slack Integration
- Anthropic launched official Claude Code Slack (Dec 2025)
- mpociot/claude-code-slack-bot wraps Claude Code SDK
- Both support MCP, so beads integration is straightforward
- Don't build custom agents (Mom, etc.) when wrappers exist

---

## Summary

| Layer | Recommendation |
|-------|----------------|
| **Source of truth** | Git (GitHub/GitLab) |
| **Local UI** | beads-better-ui (this project) |
| **CLI** | bd (beads CLI) |
| **AI integration** | Claude Code + beads MCP |
| **Slack** | claude-code-slack-bot + beads MCP |
| **Central server** | Don't build one |

---

## Sources

- [mpociot/claude-code-slack-bot](https://github.com/mpociot/claude-code-slack-bot)
- [Claude Code Slack | TechCrunch](https://techcrunch.com/2025/12/08/claude-code-is-coming-to-slack-and-thats-a-bigger-deal-than-it-sounds/)
- [beads-mcp](https://pypi.org/project/beads-mcp/)
- [OpenCode](https://github.com/opencode-ai/opencode)
- [Beads GitHub](https://github.com/steveyegge/beads)
