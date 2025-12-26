# AI Coding Agents Research (December 2025)

## Overview

The AI coding assistant landscape has evolved from simple autocomplete to agentic systems that plan, execute, and verify changes across entire repositories.

---

## Tier 1: Industry Leaders

### Claude Code (Anthropic)
- **Type**: CLI
- **Best For**: Terminal workflows, large refactors, deep repo reasoning
- **SWE-bench**: ~72%
- **Cost**: API usage (or Max subscription)
- **Context**: 200k tokens
- **Key Strength**: Editor-agnostic, runs in terminal, CI pipelines, remote servers

### Cursor
- **Type**: Full IDE (VS Code fork)
- **Best For**: Speed, smaller projects, familiar UX
- **Cost**: $20/mo Pro
- **Context**: VectorDB-based neural search
- **Key Strength**: Fast autocomplete, real-time error checking, "immediacy-first philosophy"

### Cline
- **Type**: VS Code Extension
- **Best For**: Complex projects, autonomy, MCP ecosystem
- **Cost**: Free (BYO API key)
- **Context**: Treesitter + ripgrep
- **Key Strength**: Plan/Act modes, MCP Marketplace (v3.4, Feb 2025), model-agnostic

### Aider
- **Type**: CLI
- **Best For**: Multi-file edits, terminal lovers, precise auditable changes
- **Cost**: Free (Apache-2.0, BYO API key)
- **Context**: Treesitter + fuzzy search ("best of the bunch")
- **Key Strength**: Git-aware diffs, not agentic - pure CLI augmented coder

---

## Tier 2: Strong Alternatives

### OpenHands (formerly OpenDevin)
- **Type**: Agent platform
- **SWE-bench**: 65.8% (top of verified leaderboard)
- **Best For**: Autonomous workflows, project-scale orchestration
- **Powers**: Claude, GPT, or any LLM
- **URL**: https://github.com/OpenHands/OpenHands

### Devin (Cognition AI)
- **Type**: Cloud agent (commercial)
- **Best For**: Full autonomous development
- **Key Feature**: Auto-opens PRs, auto-fixes CI failures until tests pass
- **Access**: Terminal, editor, web capabilities in controlled environment

### Gemini CLI (Google)
- **Type**: CLI
- **Best For**: Large-context refactors
- **Context**: 1M tokens (highest available)
- **Key Strength**: Massive context window for huge codebases

### Codex CLI (OpenAI)
- **Type**: CLI
- **GitHub Stars**: 31.6k
- **SWE-bench**: 72.1% claimed (unverified)
- **Key Strength**: Local-first, code stays on your machine
- **Install**: `npm install -g @openai/codex`

### Goose (Block/Square)
- **Type**: CLI
- **Best For**: Local/offline, privacy-focused
- **Key Strength**: Entirely on-machine, extensible "recipes", no cloud calls unless wanted

### Windsurf (Codeium)
- **Type**: IDE
- **Best For**: Similar to Cursor, Codeium's offering
- **Context**: VectorDB-based

---

## Tier 3: Specialized/Emerging

| Tool | Type | Notes |
|------|------|-------|
| **OpenCode** | CLI | Open source Claude Code alternative (Go) |
| **Droid (Factory)** | CLI | Top Terminal-Bench performer, great for debugging Docker issues |
| **Amazon Q CLI** | CLI | AWS-centric workflows, tight AWS tool integration |
| **Qodo Command** | CLI | Enterprise CI/CD focus, reusable agents |
| **Pi (badlogic)** | CLI | Multi-model, mid-session switching, by libGDX creator |

---

## Benchmarks

### SWE-bench Verified (Bug Fixing)
- Claude Code: ~72%
- OpenHands: 65.8%
- Codex CLI: 72.1% (claimed)

### SWE-bench Pro (Harder)
- All top models drop to ~23%
- GPT-5: 23.3%
- Claude Opus 4.1: 23.1%

### Terminal-Bench (Real Terminal Tasks)
- Featured on Claude 4 model card
- Evaluates multi-step workflows: compiling, configuring, running tools
- More practical than one-shot patch generation

### Context Understanding Methods
| Tool | Method | Quality |
|------|--------|---------|
| Aider | Treesitter + ripgrep | Best |
| Cline | Treesitter + ripgrep | Very good |
| Cursor/Windsurf | VectorDB neural search | Good but less consistent |
| Claude Code | 200k context + deep reasoning | Excellent |

---

## Cost Comparison

| Tool | Pricing Model |
|------|---------------|
| Claude Code | API usage or Max subscription |
| Cursor | $20/mo Pro, free tier available |
| Cline | Free (BYO API key) |
| Aider | Free (BYO API key) |
| Codex CLI | Free (BYO OpenAI key) |
| Goose | Free (local models or BYO key) |
| Devin | Commercial (enterprise pricing) |

---

## Recommendations by Use Case

- **Terminal power user**: Aider or Claude Code
- **New product from scratch**: Cursor
- **Large refactoring**: Claude Code or Cursor
- **Complex multi-file projects**: Cline
- **Privacy/offline**: Goose
- **AWS workflows**: Amazon Q CLI
- **Huge context needs**: Gemini CLI (1M tokens)

---

## Sources

- [Claude Code Alternatives | Qodo](https://www.qodo.ai/blog/claude-code-alternatives/)
- [Top 6 Claude Code Alternatives | Cline](https://cline.bot/blog/top-6-claude-code-alternatives-for-agentic-coding-workflows-in-2025)
- [AI Coding Agents Benchmark | Render](https://render.com/blog/ai-coding-agents-benchmark)
- [Agentic CLI Tools Compared | AI Multiple](https://research.aimultiple.com/agentic-cli/)
- [Terminal-Bench](https://www.tbench.ai/)
- [OpenHands GitHub](https://github.com/OpenHands/OpenHands)
- [Top 10 Open-Source CLI Coding Agents | DEV](https://dev.to/forgecode/top-10-open-source-cli-coding-agents-you-should-be-using-in-2025-with-links-244m)
- [Benched.ai Top Coding Agents](https://benched.ai/guides/top-coding-agents-2025)
