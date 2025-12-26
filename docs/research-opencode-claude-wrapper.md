# OpenCode: Open Source Claude Wrapper Research (December 2025)

## The Question

What if you want:
- A customized wrapper around Claude
- Nearly as good as Claude Code
- Access to the whole MCP marketplace/ecosystem
- Open source and easy to customize

**Answer: OpenCode**

---

## OpenCode Overview

**GitHub**: [opencode-ai/opencode](https://github.com/opencode-ai/opencode)
**License**: MIT (fully open source)
**Language**: Go (fast, easy to build)
**Install**: `brew install opencode` or `npm i -g opencode-ai@latest`

OpenCode is an open-source AI coding agent built from the ground up for the terminal. After a major rewrite, it's now mature and ready for general use.

---

## Key Features

### Multi-Provider Support
- **Claude Pro/Max** - Direct login with Anthropic accounts
- **75+ LLM providers** - Including local models (Ollama, etc.)
- Swap models anytime without changing workflow

### MCP (Model Context Protocol) Integration
- Full MCP support - access the entire ecosystem
- Automatic tool discovery from MCP servers
- Same MCP config works in OpenCode and Claude Code
- External tool integration via standardized protocol

### LSP Integration
- Automatically detects project language/framework
- Spins up appropriate Language Server Protocol server
- Gives LLM the same structural understanding as your editor
- Deep code comprehension beyond simple text parsing

### Terminal User Interface
- Interactive TUI built with Bubble Tea (Go)
- Session management with SQLite persistence
- Vim-like editor
- Tool integration (execute commands, search files, modify code)

---

## Comparison: OpenCode vs Claude Code

| Feature | OpenCode | Claude Code |
|---------|----------|-------------|
| **Open Source** | ✅ MIT License | ❌ Proprietary |
| **Claude Models** | ✅ | ✅ |
| **Other Providers** | ✅ 75+ | ❌ Claude only |
| **MCP Support** | ✅ | ✅ |
| **LSP Integration** | ✅ | ❌ |
| **Local Models** | ✅ Ollama, etc. | ❌ |
| **Customizable** | ✅ Fork and modify | ❌ |
| **Language** | Go | TypeScript |
| **IDE Integration** | ❌ Terminal only | ✅ VS Code, JetBrains |

---

## Why Not Claude Agent SDK?

The Claude Agent SDK is **NOT open source**:

> "Use of the Claude Agent SDK is governed by Anthropic's Commercial Terms of Service, including when you use it to power products and services that you make available to your own customers and end users."

You can use it, but you can't freely fork/modify it for your own product.

---

## Installation Options

```bash
# macOS (Homebrew)
brew install opencode

# npm (cross-platform)
npm i -g opencode-ai@latest

# curl (Linux/macOS)
curl -fsSL opencode.ai/install | bash

# Windows (Scoop)
scoop install opencode

# Windows (Chocolatey)
choco install opencode
```

---

## MCP Configuration

OpenCode uses standard MCP configuration. Example `~/.opencode/mcp.json`:

```json
{
  "mcpServers": {
    "beads": {
      "command": "beads-mcp"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  }
}
```

Same servers work in both OpenCode and Claude Code.

---

## Customization Path

To build your own customized version:

1. **Fork the repo**: https://github.com/opencode-ai/opencode
2. **It's Go** - compiles fast, single binary
3. **Modify the TUI** - Bubble Tea is well-documented
4. **Add features** - custom tools, different UI, new behaviors
5. **MCP works out of the box** - whole ecosystem available

---

## Architecture

```
OpenCode (Go binary)
    │
    ├── TUI Layer (Bubble Tea)
    │
    ├── Agent Core
    │   ├── Multi-provider LLM support
    │   ├── Tool execution
    │   └── Session management (SQLite)
    │
    ├── MCP Client
    │   └── Connects to any MCP server
    │
    └── LSP Integration
        └── Language-aware code understanding
```

---

## Community Assessment

> "The best tool I've tried so far remains Claude Code, but I have to admit that OpenCode with sonnet-4 could replace it soon."

- Fresh rewrite, actively developed
- Growing community
- MIT license means true freedom to customize

---

## Related: Claude Market

Open-source plugin marketplace for Claude Code compatible tools:

**GitHub**: [claude-market/marketplace](https://github.com/claude-market/marketplace)

- Hand-curated plugins, tools, agents, MCP servers
- Works with Claude Code and compatible tools like OpenCode
- Community-reviewed for quality

---

## Recommended Stack for Custom Agent

```
Your Custom Fork of OpenCode (MIT)
    ↓
Claude API (or any of 75+ providers)
    ↓
MCP Servers:
    ├── beads (issue tracking)
    ├── filesystem
    ├── git
    └── your custom tools
```

---

## Sources

- [OpenCode GitHub](https://github.com/opencode-ai/opencode)
- [OpenCode: Open Source Claude Code Alternative | Apidog](https://apidog.com/blog/opencode/)
- [OpenCode: How It Elevates Your Terminal Workflow | DEV](https://dev.to/apilover/opencode-the-open-source-claude-code-alternative-how-it-elevates-your-terminal-workflow-2apl)
- [Comparing Claude Code vs OpenCode](https://www.andreagrandi.it/posts/comparing-claude-code-vs-opencode-testing-different-models/)
- [Claude Agent SDK Python (proprietary)](https://github.com/anthropics/claude-agent-sdk-python)
- [Claude Agent SDK Docs](https://docs.claude.com/en/api/agent-sdk/overview)
- [Claude Market](https://github.com/claude-market/marketplace)
- [10+ Best Open Source Claude Code Alternatives](https://openalternative.co/alternatives/claude-code)
