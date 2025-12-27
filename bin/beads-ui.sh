#!/bin/bash
# Launch Beads Better UI for the current project
# Usage: beads-ui [project-path]

PROJECT_DIR="${1:-$(pwd)}"
UI_DIR="$HOME/code/beads-better-ui"

# Check if it's a beads project
if [ ! -d "$PROJECT_DIR/.beads" ]; then
  echo "Error: No .beads directory found in $PROJECT_DIR"
  echo "Run 'bd init <prefix>' first to initialize beads"
  exit 1
fi

# Find an available port
PORT=5173
while lsof -i :$PORT > /dev/null 2>&1; do
  ((PORT++))
  if [ $PORT -gt 5199 ]; then
    echo "Error: No available port found"
    exit 1
  fi
done

SERVER_PORT=3001
while lsof -i :$SERVER_PORT > /dev/null 2>&1; do
  ((SERVER_PORT++))
  if [ $SERVER_PORT -gt 3099 ]; then
    echo "Error: No available server port found"
    exit 1
  fi
done

echo "Starting Beads UI for: $PROJECT_DIR"
echo "UI: http://localhost:$PORT"
echo "Server: http://localhost:$SERVER_PORT"

# Start server in the project directory
cd "$PROJECT_DIR"
PORT=$SERVER_PORT node "$UI_DIR/server/index.js" &
SERVER_PID=$!

# Start vite dev server with matching server port
cd "$UI_DIR"
BEADS_SERVER_PORT=$SERVER_PORT npm run dev -- --port $PORT &
VITE_PID=$!

# Wait a moment then open browser
sleep 2
open "http://localhost:$PORT"

echo ""
echo "Press Ctrl+C to stop"

# Cleanup on exit
trap "kill $SERVER_PID $VITE_PID 2>/dev/null" EXIT

# Wait for either to exit
wait
