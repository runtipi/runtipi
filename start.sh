#!/bin/bash

# Kill all instances of npm or node
pkill -f "npm|node"

# Run npm run start in the worker/ directory
cd /worker && node index.js start &

# Wait for http://localhost:5000/healthcheck to return OK with a maximum of 5 retries
retries=0
max_retries=5
while true; do
    if [[ "$(curl -s http://localhost:5000/healthcheck)" == "OK" ]]; then
        break
    fi

    retries=$((retries + 1))
    if [ "$retries" -eq "$max_retries" ]; then
        echo "Failed to get a successful response after $max_retries retries. Exiting script."
        exit 1
    fi

    sleep 1
done

# Go to the dash/ directory and run npm run start
cd /dash && npm run start
