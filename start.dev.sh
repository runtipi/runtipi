#!/bin/sh

# Start worker
pm2 start pnpm --name worker -- --filter @runtipi/worker -r dev

# Wait for http://localhost:5000/healthcheck to return OK
while true; do
    if  [ "$(curl -s http://localhost:5000/worker-api/healthcheck)" = "OK" ]; then
        break
    fi
    sleep 1
done

pm2 start npm --name dashboard -- run dev

# Log apps realtime
pm2 logs --raw
