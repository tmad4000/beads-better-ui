# Beads Better UI - Project Instructions

## Change Tracking

When making changes to this project:
1. Create a beads ticket for any feature, bug fix, or significant change
2. Use `bd create "Title" --type <type> --priority <priority>` to create tickets
3. Reference the ticket ID in commit messages when applicable

## Development

- Run `npm run dev` to start the Vite dev server (port 5173)
- Run `npm run server` to start the WebSocket backend (port 3001)
- The Vite dev server proxies `/ws` to the backend

## Architecture

- Frontend: React + TypeScript + Tailwind CSS + Vite
- Backend: Node.js WebSocket server that wraps the `bd` CLI
- All issue operations go through WebSocket messages to the server

## Conventions

- Use conventional commits (feat:, fix:, docs:, etc.)
- TypeScript strict mode is enabled
- Dark mode is system-adaptive (uses `prefers-color-scheme`)
