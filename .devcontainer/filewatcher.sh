#!/usr/bin/env bash
# We need to change the owner of the files in the app-data folder
# if this failes we have to change the permission your self
fswatch --event=Created /workspaces/runtipi/app-data/ | \
   xargs -l1 sh -c 'echo "$1" && sudo chown node "$1" -R' -- &