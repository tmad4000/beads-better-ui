# Beads Better UI
A modern, intuitive web interface for the [Beads](https://github.com/steveyegge/beads) issue tracker.
## Goals
- **Better UX/UI**: Clean, modern interface with excellent sorting and filtering
- **Labels First**: Labels visible in list view with easy filtering
- **Date-Aware**: Sort by created, updated, closed dates
- **Fast**: Minimal latency, real-time updates
- **Keyboard-Driven**: Full keyboard navigation support
## Tech Stack
- React + TypeScript
- Vite for fast development
- Tailwind CSS for styling
- WebSocket for real-time updates
- Communicates with `bd` CLI via JSON output
## Development
```bash
npm install
npm run dev
```
## File Loading Support
The UI can open issue files directly, without needing a WebSocket connection:
### Supported Formats
| Format | Extension | Description |
| --- | --- | --- |
| MarkTree | .mt | JSON-based hierarchical document format |
| Beads JSONL | .jsonl | Line-delimited JSON (native Beads format) |
| JSON | .json | Array of issues or MarkTree format |

### How to Use
- Click the **Open** button in the header
- Select a `.mt`, `.json`, or `.jsonl` file
- Issues will display in the UI (read-only mode)
Or when the WebSocket isn't connected, click "open a file" in the loading screen.
### Export
Click the **Export** button to save current issues as:
- `.jsonl` - Beads-compatible format
- `.mt` - MarkTree format (for use with MarkTree app)
### MarkTree Compatibility
This UI can open MarkTree (`.mt`) files created by the [MarkTree](https://github.com/tmad4000/Gemini3Workflowy) app. The formats are bidirectionally compatible:
- Open `.mt` files in this UI to view with Beads Better UI's interface
- Export to `.mt` to edit in MarkTree's visual outliner
- Both apps can open `.beads/issues.jsonl` files
## Features
See beads issues for the full feature list and roadmap.
