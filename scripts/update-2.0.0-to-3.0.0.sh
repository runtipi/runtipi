#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

ARCHITECTURE="$(uname -m)"

ASSET="runtipi-cli-linux-x86_64.tar.gz"
if [[ "$ARCHITECTURE" == "arm64" || "$ARCHITECTURE" == "aarch64" ]]; then
  ASSET="runtipi-cli-linux-aarch64.tar.gz"
fi

URL="https://github.com/runtipi/runtipi/releases/download/v3.0.3/$ASSET"

rm -f ./runtipi-cli

if [[ "$ASSET" == *".tar.gz" ]]; then
  curl --location "$URL" -o ./runtipi-cli.tar.gz
  tar -xzf ./runtipi-cli.tar.gz

  asset_name=$(tar -tzf ./runtipi-cli.tar.gz | head -n 1 | cut -f1 -d"/")
  mv "./${asset_name}" ./runtipi-cli
  rm ./runtipi-cli.tar.gz
else
  curl --location "$URL" -o ./runtipi-cli
fi

chmod +x ./runtipi-cli
sudo ./runtipi-cli start
