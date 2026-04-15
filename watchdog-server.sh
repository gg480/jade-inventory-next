#!/bin/bash
# Watchdog script that auto-restarts the Next.js server when it dies
cd /home/z/my-project

while true; do
  echo "[$(date +%H:%M:%S)] Starting Next.js production server..."
  NODE_OPTIONS="--max-old-space-size=2048" node node_modules/.bin/next start -p 3000 &
  SERVER_PID=$!
  
  # Wait for server to be ready
  for i in $(seq 1 30); do
    if curl -s --max-time 2 http://localhost:3000/ > /dev/null 2>&1; then
      echo "[$(date +%H:%M:%S)] Server ready (PID: $SERVER_PID)"
      break
    fi
    sleep 1
  done
  
  # Monitor server
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 5
  done
  
  echo "[$(date +%H:%M:%S)] Server died, restarting in 3s..."
  sleep 3
done
