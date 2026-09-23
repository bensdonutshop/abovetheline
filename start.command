#!/bin/bash
# Double-click to start Above the Line. Close the window (or ctrl-c) to stop it.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node isn't installed. Get the LTS build from https://nodejs.org, then try again."
  echo; read -r -p "Press return to close."
  exit 1
fi

# Already serving? Just open it rather than failing on a busy port.
if [ -f .port ]; then
  RUNNING="$(cat .port)"
  if curl -sf -m 2 "http://localhost:$RUNNING/api/status" >/dev/null 2>&1; then
    echo "Above the Line is already running on port $RUNNING — opening it."
    open "http://localhost:$RUNNING"
    exit 0
  fi
  rm -f .port
fi

PORT="${PORT:-4173}"
echo "Starting Above the Line…"
echo "Keep this window open. Press ctrl-c to stop."
echo

# The server picks the next free port if this one is taken, and writes the
# real one to .port — wait for that, then open the browser on it.
( for _ in $(seq 1 40); do
    sleep 0.5
    [ -f .port ] && { open "http://localhost:$(cat .port)"; break; }
  done ) &

PORT="$PORT" exec node server.js
