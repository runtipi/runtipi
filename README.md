# ⛺️ Tipi — A personal homeserver for everyone
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-5-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
[![License](https://img.shields.io/github/license/meienberger/runtipi)](https://github.com/meienberger/runtipi/blob/master/LICENSE)
[![Version](https://img.shields.io/github/v/release/meienberger/runtipi?color=%235351FB&label=version)](https://github.com/meienberger/runtipi/releases)
![Issues](https://img.shields.io/github/issues/meienberger/runtipi)
[![Docker Pulls](https://badgen.net/docker/pulls/meienberger/runtipi?icon=docker&label=pulls)](https://hub.docker.com/r/meienberger/runtipi/)
[![Docker Image Size](https://badgen.net/docker/size/meienberger/runtipi?icon=docker&label=image%20size)](https://hub.docker.com/r/meienberger/runtipi/)
![Build](https://github.com/meienberger/runtipi/workflows/Tipi%20CI/badge.svg)
#### Join the discussion
[![Discord](https://img.shields.io/discord/976934649643294750?label=discord&logo=discord)](https://discord.gg/Bu9qEPnHsc)
[![Matrix](https://img.shields.io/matrix/runtipi:matrix.org?label=matrix&logo=matrix)](https://matrix.to/#/#runtipi:matrix.org)

![Preview](https://raw.githubusercontent.com/meienberger/runtipi/develop/screenshots/appstore.png)
> ⚠️ Tipi is still at an early stage of development and issues are to be expected. Feel free to open an issue or pull request if you find a bug.

Tipi is a personal homeserver orchestrator. It is running docker containers under the hood and provides a simple web interface to manage them. Every service comes with an opinionated configuration in order to remove the need for manual configuration and network setup.

Check our demo instance : **95.179.210.152** / username: **user@runtipi.com** / password: **runtipi**

## Apps available
- [Adguard Home](https://github.com/AdguardTeam/AdGuardHome) - Adguard Home DNS adblocker
- [Calibre-Web](https://github.com/janeczku/calibre-web) - Web Ebook Reader
- [Code-Server](https://github.com/coder/code-server) - Web VS Code 
- [Filebrowser](https://github.com/filebrowser/filebrowser) - Web File Browser
- [Freshrss](https://github.com/FreshRSS/FreshRSS) - A free, self-hostable RSS aggregator
- [Gitea](https://github.com/go-gitea/gitea) - Gitea - A painless self-hosted Git service
- [Homarr](https://github.com/ajnart/homarr) - A homepage for your server
- [Home Assistant](https://github.com/home-assistant/core) - Open source home automation that puts local control and privacy first
- [Invidious](https://github.com/iv-org/invidious) - An alternative front-end to YouTube
- [Jackett](https://github.com/Jackett/Jackett) - API Support for your favorite torrent trackers
- [Jellyfin](https://github.com/jellyfin/jellyfin) - A media server for your home collection
- [Joplin](https://github.com/laurent22/joplin) - Privacy focused note-taking app
- [Libreddit](https://github.com/spikecodes/libreddit) - Private front-end for Reddit
- [Mealie](https://github.com/hay-kot/mealie) - Self-hosted recipe manager and meal planner.
- [n8n](https://github.com/n8n-io/n8n) - Workflow Automation Tool
- [Nextcloud](https://github.com/nextcloud/server) - A safe home for all your data
- [Nitter](https://github.com/zedeus/nitter) - Alternative Twitter front-end
- [Node-RED](https://github.com/node-red/node-red) - Low-code programming for event-driven applications
- [Photoprism](https://github.com/photoprism/photoprism) - AI-Powered Photos App for the Decentralized Web. We are on a mission to protect your freedom and privacy.
- [Pihole](https://github.com/pi-hole/pi-hole) - A black hole for Internet advertisements
- [Plex](https://github.com/plexinc/pms-docker) - Stream Movies & TV Shows
- [Prowlarr](https://github.com/Prowlarr/Prowlarr/) - A torrent/usenet indexer manager/proxy
- [Radarr](https://github.com/Radarr/Radarr) - Movie collection manager for Usenet and BitTorrent users
- [Resilio Sync](https://github.com/bt-sync) - Fast, reliable, and simple file sync and share solution
- [Sonarr](https://github.com/Sonarr/Sonarr) - TV show manager for Usenet and BitTorrent
- [Syncthing](https://github.com/syncthing/syncthing) - Continuous File Synchronization
- [Tailscale](https://github.com/tailscale/tailscale) - The easiest, most secure way to use WireGuard and 2FA
- [Tautulli](https://github.com/Tautulli/Tautulli) - A Python based monitoring and tracking tool for Plex Media Server
- [Transmission](https://github.com/transmission/transmission) - Fast, easy, and free BitTorrent client
- [Wireguard Easy](https://github.com/WeeJeWel/wg-easy) - WireGuard VPN + Web-based Admin UI
- [Vaultwarden](https://github.com/dani-garcia/vaultwarden) - Unofficial Bitwarden compatible server

## 🛠 Installation

### Installation Requirements
Ubuntu 18.04 LTS or higher is recommended. However other major Linux distribution are supported but may lead to installation issues. Please file an issue if you encounter one.

### Step 1. Download Tipi
Run this in an empty directory where you want to install Tipi.

```bash
git clone https://github.com/meienberger/runtipi.git
```

### Step 2. Run Tipi
cd into the downloaded directory and run the start script.

```bash
cd runtipi
sudo ./scripts/start.sh
```

The script will prompt you the ip address of the dashboard once configured.
Tipi will run by default on port 80. To select another port you can run the start script with the `--port` argument

```bash
sudo ./scripts/start.sh --port 7000
```

To stop Tipi, run the stop script.

```bash
sudo ./scripts/stop.sh
```

## ❤️ Contributing

Tipi is made to be very easy to plug in new apps. We welcome and appreciate new contributions.

If you want to add a new app or feature, you can follow the [Contribution guide](https://github.com/meienberger/runtipi/wiki/Contributing-to-Tipi) for instructions on how to do so.

## 📜 License
[![License](https://img.shields.io/github/license/meienberger/runtipi)](https://github.com/meienberger/runtipi/blob/master/LICENSE)

Tipi is licensed under the GNU General Public License v3.0. TL;DR — You may copy, distribute and modify the software as long as you track changes/dates in source files. Any modifications to or software including (via compiler) GPL-licensed code must also be made available under the GPL along with build & install instructions.

## 🗣 Community
- [Matrix](https://matrix.to/#/#runtipi:matrix.org)<br />
- [Twitter](https://twitter.com/runtipi)
- [Telegram](https://t.me/+72-y10MnLBw2ZGI0)
- [Discord](https://discord.gg/Bu9qEPnHsc)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://meienberger.dev/"><img src="https://avatars.githubusercontent.com/u/47644445?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Nicolas Meienberger</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=meienberger" title="Code">💻</a> <a href="#infra-meienberger" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/meienberger/runtipi/commits?author=meienberger" title="Tests">⚠️</a> <a href="https://github.com/meienberger/runtipi/commits?author=meienberger" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/ArneNaessens"><img src="https://avatars.githubusercontent.com/u/16622722?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ArneNaessens</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=ArneNaessens" title="Code">💻</a> <a href="#ideas-ArneNaessens" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/meienberger/runtipi/commits?author=ArneNaessens" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/DrMxrcy"><img src="https://avatars.githubusercontent.com/u/58747968?v=4?s=100" width="100px;" alt=""/><br /><sub><b>DrMxrcy</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=DrMxrcy" title="Code">💻</a> <a href="#ideas-DrMxrcy" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/meienberger/runtipi/commits?author=DrMxrcy" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://cobre.dev"><img src="https://avatars.githubusercontent.com/u/36574329?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Cooper</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=CobreDev" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/JTruj1ll0923"><img src="https://avatars.githubusercontent.com/u/6656643?v=4?s=100" width="100px;" alt=""/><br /><sub><b>JTruj1ll0923</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=JTruj1ll0923" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!