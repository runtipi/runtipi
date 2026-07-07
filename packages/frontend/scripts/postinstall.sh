#!/bin/sh

FILE="./node_modules/@tabler/core/dist/js/tabler.min.js"

[ -f "$FILE" ] || exit 0

cp "$FILE" ./public/js/tabler.min.js
