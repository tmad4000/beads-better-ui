#!/bin/bash
# List running Beads UI instances
echo "Running Beads UI instances:"
echo ""

# Find node processes running the server
ps aux | grep "node.*beads-better-ui/server" | grep -v grep | while read line; do
  PID=$(echo "$line" | awk '{print $2}')
  # Get the working directory of the process
  CWD=$(lsof -p $PID 2>/dev/null | grep cwd | awk '{print $NF}')
  # Get the port
  PORT=$(lsof -p $PID -i 2>/dev/null | grep LISTEN | awk '{print $9}' | cut -d: -f2)
  if [ -n "$CWD" ]; then
    echo "  $CWD"
    echo "    Server: http://localhost:$PORT"
    echo ""
  fi
done

# List vite dev servers
echo "UI Ports in use:"
lsof -i :5173-5199 2>/dev/null | grep LISTEN | awk '{print "  http://localhost:" $9}' | sed 's/.*:/  http:\/\/localhost:/'
