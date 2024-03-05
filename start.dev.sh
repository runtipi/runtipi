#!/bin/bash

# Kill all instances of npm or node
pkill -f "npm|node"

# Run npm run start in the worker/ directory
cd /worker
pm2 start pnpm --name worker -- --filter @runtipi/worker -r dev

# Wait for http://localhost:5000/healthcheck to return OK with a maximum of 5 retries
while true; do
    if [[ "$(curl -s http://localhost:5000/worker-api/healthcheck)" == "OK" ]]; then
        break
    fi
    sleep 1
done

# Go to the dash/ directory and run npm run start
cd /dash
pm2 start npm --name dashboard -- run dev
