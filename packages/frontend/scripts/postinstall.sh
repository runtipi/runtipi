#!/bin/sh

set -eu

FILE=$(bun -p "require.resolve('@tabler/core/dist/js/tabler.min.js')")

mkdir -p ./public/js
cp "$FILE" ./public/js/tabler.min.js
