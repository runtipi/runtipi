#!/bin/sh

# Start worker
cd /worker || exit
pm2 start index.js --name worker -- start

# Wait for http://localhost:5000/healthcheck to return OK
while true; do
    if [ "$(curl -s http://localhost:5000/worker-api/healthcheck)" = "OK" ]; then
        break
    fi
    sleep 1
done

# Start apps
cd /dashboard || exit
pm2 start npm --name dashboard -- run start

# Log apps realtime
pm2 logs --raw
