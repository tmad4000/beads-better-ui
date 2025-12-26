# Beads Slack Integration Options (December 2025)

## Goal

Create a way to send Slack messages and have them create beads issues.

---

## Option 1: Anthropic's Official Claude Code Slack (Best if it fits)

**Status**: Launched December 9, 2025 (research preview)

### How It Works
- Tag @Claude in Slack → full coding session
- Claude analyzes messages, identifies repository
- Posts progress updates in threads
- Opens pull requests automatically

### Pros
- First-party, fully optimized by Anthropic
- Maintained and updated
- Gets all Claude Code optimizations

### Cons
- May not have beads integration out of the box
- Research preview (may have limitations)

### Source
- [Claude Code is coming to Slack | TechCrunch](https://techcrunch.com/2025/12/08/claude-code-is-coming-to-slack-and-thats-a-bigger-deal-than-it-sounds/)

---

## Option 2: mpociot/claude-code-slack-bot (Recommended)

**URL**: https://github.com/mpociot/claude-code-slack-bot

### What It Is
A Slack bot that wraps the **actual Claude Code SDK**, giving you all of Claude Code's optimizations in Slack.

### Features
- Streaming responses (real-time updates)
- Thread support (conversation context)
- File uploads (images, code, documents)
- **MCP server support** (beads has an MCP server!)
- Session management
- Working directory management

### Architecture
```
Slack → Bot → Claude Code SDK → Full Claude Code Power
```

### How to Add Beads
1. Fork the repo
2. Add beads MCP server to config
3. Done - Claude Code in Slack with beads

### Pros
- Uses real Claude Code SDK (not rebuilding the wheel)
- Already handles Slack complexity
- MCP support means easy beads integration
- Moderate complexity, focused modules

### Tech Stack
- Node.js 18+
- TypeScript
- Slack Socket Mode

---

## Option 3: Mom (pi-mono) - NOT Recommended

**URL**: https://github.com/badlogic/pi-mono/tree/main/packages/mom

### What It Is
A Slack bot by Mario Zechner (libGDX creator) that uses a custom agent runtime (pi-agent), not Claude Code.

### Architecture
```
Slack → Mom → pi-agent → Claude API → custom tools
```

### Why Not Recommended
- **Does NOT use Claude Code** - rebuilds agent from scratch
- 1,500+ lines of agent.ts alone
- You're maintaining custom agent code
- Claude Code is already optimized; why rebuild it?

### When Mom Makes Sense
If you want a full AI assistant that can do anything:
- "Look at this PR and tell me what's wrong"
- "Debug why tests are failing"
- "Refactor this file to use TypeScript"

For just beads integration, it's overkill.

---

## Option 4: Simple Webhook Server (Lightweight)

For basic "Slack command → beads issue" without AI:

```
Slack slash command → Your server → bd CLI → git push → Slack response
```

### Example Code (~50 lines)
```javascript
const { App } = require('@slack/bolt');
const { execSync } = require('child_process');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.command('/bd', async ({ command, ack, respond }) => {
  await ack();

  const [action, ...args] = command.text.split(' ');

  try {
    let result;
    switch (action) {
      case 'create':
        result = execSync(`bd create "${args.join(' ')}" --type task`);
        execSync('git add .beads && git commit -m "Add task from Slack" && git push');
        break;
      case 'list':
        result = execSync('bd list --status open');
        break;
      case 'done':
        result = execSync(`bd update ${args[0]} --status done`);
        execSync('git add .beads && git commit -m "Complete task from Slack" && git push');
        break;
      default:
        result = 'Unknown command. Try: create, list, done';
    }
    await respond(`\`\`\`${result}\`\`\``);
  } catch (error) {
    await respond(`Error: ${error.message}`);
  }
});

app.start(3000);
```

### Pros
- Simple, fast, predictable
- No LLM costs
- Easy to host (Railway, Fly.io, etc.)

### Cons
- Rigid commands, no natural language
- No AI understanding

---

## Option 5: Lightweight LLM Layer (Middle Ground)

Add natural language parsing without full agent:

```
Slack → Server → Claude (parse intent only) → bd CLI → git
```

### How It Works
1. User: "remind me to fix the login bug tomorrow"
2. Single Claude API call extracts: `{action: "create", title: "fix login bug", priority: "p2"}`
3. Call bd CLI with extracted params
4. Respond in Slack

### Pros
- Natural language understanding
- Much simpler than full agent
- Cheaper than continuous agent sessions

---

## Option 6: GitHub Action + Slack Workflow

```
Slack workflow → GitHub webhook → Action runs bd CLI → commits
```

### Pros
- No server to maintain
- Serverless

### Cons
- Slower, less interactive
- More complex setup

---

## Recommendation

**Start with Option 2 (mpociot/claude-code-slack-bot)**:

1. It wraps the **actual Claude Code SDK**
2. Already handles Slack complexity
3. Supports **MCP servers** - beads has one!
4. You get Claude Code's full power
5. Minimal custom code to maintain

Then add beads MCP server:
```json
{
  "mcpServers": {
    "beads": {
      "command": "beads-mcp"
    }
  }
}
```

---

## Sources

- [mpociot/claude-code-slack-bot](https://github.com/mpociot/claude-code-slack-bot)
- [AnandChowdhary/claude-code-slack-bot](https://github.com/AnandChowdhary/claude-code-slack-bot)
- [Claude Code Slack | TechCrunch](https://techcrunch.com/2025/12/08/claude-code-is-coming-to-slack-and-thats-a-bigger-deal-than-it-sounds/)
- [pi-mono/mom](https://github.com/badlogic/pi-mono/tree/main/packages/mom)
- [beads-mcp](https://pypi.org/project/beads-mcp/)
