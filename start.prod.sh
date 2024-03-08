#!/bin/sh

# Start worker
cd worker/ || exit
pm2 start index.js --ignore-watch="/worker" --name worker -- start

# Wait for http://localhost:5000/healthcheck to return OK with a maximum of 5 retries
while true; do
    if [ "$(curl -s http://localhost:5000/worker-api/healthcheck)" = "OK" ]; then
        break
    fi
    sleep 1
done

# Start apps
cd /dashboard || exit
pm2 start npm --ignore-watch="/dashboard" --name dashboard -- run start

# Log apps realtime
pm2 logs
