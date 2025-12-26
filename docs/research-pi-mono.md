# Pi-Mono Research (December 2025)

## Overview

Pi-mono is a monorepo by Mario Zechner (badlogic) containing tools for building AI agents and managing LLM deployments.

**GitHub**: https://github.com/badlogic/pi-mono
**Stars**: 715
**Language**: TypeScript

---

## About the Creator

**Mario Zechner** (@badlogic)
- Creator of **libGDX** (24.6k GitHub stars) - one of the most popular Java game frameworks
- Well-respected in the gamedev community (5k+ Mastodon followers)
- Self-described "Benevolent dictator of libGDX, Beginning Android Games, RoboVM, Spine"
- Author of "Beginning Android Games" book

---

## Packages

### @mariozechner/pi-ai
Unified multi-provider LLM API supporting:
- OpenAI
- Anthropic
- Google
- Mistral
- Groq
- Ollama (local)
- vLLM (self-hosted)

### @mariozechner/pi-agent-core
Stateful abstraction layer for LLM interactions:
- Reactive state management
- Event system (lifecycle, turns, messages, tools)
- Transport abstraction (direct API or proxy)
- Tool integration with execution tracking

### @mariozechner/pi-coding-agent
Terminal-based coding agent (similar to Claude Code):
- Multi-model support with mid-session switching
- Session persistence (`~/.pi/agent/sessions/`)
- Context compaction for long sessions
- Branching (explore alternative conversation paths)
- File operations, bash execution
- Custom slash commands and skills
- Project context via `AGENTS.md` or `CLAUDE.md`

**Install**: `npm install -g @mariozechner/pi-coding-agent`

### @mariozechner/pi-mom
Slack bot that delegates to the coding agent:
- Socket Mode connection
- Docker sandboxed execution
- Persistent workspace per channel
- Memory system (global + channel-specific)
- Events system (scheduled tasks, cron)
- Custom "skills" (CLI tools)

### @mariozechner/pi-tui
Terminal UI library with differential rendering.

### @mariozechner/pi-web-ui
Web components for AI chat interfaces.

### @mariozechner/pi-proxy
CORS proxy for browser-based LLM calls.

### @mariozechner/pi-pods
CLI for managing vLLM deployments on GPU pods.

---

## Mom (Master of Mischief) Deep Dive

### What It Is
A self-managing Slack bot powered by Claude that:
- Installs its own tools (apk, npm, etc.)
- Writes scripts and configures credentials
- Maintains workspace autonomously
- Executes in Docker sandbox

### Architecture
```
Slack (Socket Mode)
    ↓
Mom Agent (agent.ts ~1,500+ lines)
    ↓
pi-agent-core (state, events, tools)
    ↓
pi-ai (Claude API)
    ↓
Bash/File tools in Docker
```

### Workspace Structure (per channel)
```
data/
├── MEMORY.md          # Global context
└── channels/
    └── channel-name/
        ├── log.jsonl      # Complete message history
        ├── context.jsonl  # LLM context (synced from log)
        ├── MEMORY.md      # Channel-specific context
        ├── attachments/   # User-shared files
        └── skills/        # Channel-specific tools
```

### Memory System
1. **Global memory** (`data/MEMORY.md`): Shared across all channels
2. **Channel memory**: Channel-specific context and decisions
3. Auto-reads before responding
4. Can be edited manually or via commands

### Events System
- **Immediate**: Triggers instantly
- **One-shot**: Fires at specific date/time
- **Periodic**: Cron-based recurring tasks

Events stored as JSON in `data/events/`.

### Dependencies
```json
{
  "@anthropic-ai/sandbox-runtime": "^0.0.16",
  "@mariozechner/pi-agent-core": "^0.30.2",
  "@mariozechner/pi-ai": "^0.30.2",
  "@mariozechner/pi-coding-agent": "^0.30.2",
  "@slack/socket-mode": "^2.0.0",
  "@slack/web-api": "^7.0.0",
  "croner": "^9.1.0"
}
```

---

## Pi Coding Agent vs Claude Code

| Feature | Pi | Claude Code |
|---------|-----|-------------|
| Interface | Terminal CLI | Terminal CLI |
| Provider | Multi-model (15+) | Claude only |
| Model Switching | Mid-session via `/model` | Single model |
| Branching | Yes | No |
| Session Persistence | Yes | Yes |
| IDE Integration | None | VS Code, JetBrains |
| MCP Support | No (has own skills) | Yes |
| Pricing | BYO API keys | Anthropic subscription/API |
| Self-hosted | Yes (Ollama, vLLM) | No |

### Pi's Unique Features
- Switch models mid-conversation without losing context
- Branch conversations to explore alternatives
- Works with local models (Ollama, vLLM)
- Lightweight, no ecosystem lock-in

### Claude Code's Advantages
- MCP ecosystem
- IDE integrations
- Web search built-in
- Anthropic-optimized for Claude models
- Higher SWE-bench scores

---

## Related Projects

### pi-skills
Skills for pi-coding-agent, compatible with:
- Claude Code
- Codex CLI
- Amp
- Droid

**GitHub**: https://github.com/badlogic/pi-skills
**Stars**: 68

### pi-terminal-bench
Harbor agent adapter for Terminal-Bench evaluations.

**GitHub**: https://github.com/badlogic/pi-terminal-bench

---

## Why Not Use Mom for Beads Integration?

1. **Doesn't use Claude Code** - rebuilds agent from scratch
2. **1,500+ lines** of agent logic to maintain
3. **Claude Code SDK exists** - why rebuild what's already optimized?
4. **mpociot/claude-code-slack-bot** wraps actual Claude Code

Mom makes sense if you want a general-purpose AI assistant in Slack. For just beads integration, it's overkill.

---

## Sources

- [pi-mono GitHub](https://github.com/badlogic/pi-mono)
- [pi-mom package](https://github.com/badlogic/pi-mono/tree/main/packages/mom)
- [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)
- [pi-skills](https://github.com/badlogic/pi-skills)
- [libGDX Wikipedia](https://en.wikipedia.org/wiki/LibGDX)
- [Mario Zechner GitHub](https://github.com/badlogic)
