#!/bin/sh

# Start worker
cd worker/
pm2 start index.js --ignore-watch="/worker" --name worker -- start

# Wait for http://localhost:5000/healthcheck to return OK with a maximum of 5 retries
while true; do
    if [[ "$(curl -s http://localhost:5000/worker-api/healthcheck)" == "OK" ]]; then
        break
    fi
    sleep 1
done

# Start apps
cd /dash
pm2 start npm --ignore-watch="/dash" --name dashboard -- run start

# Log apps realtime
pm2 logs