# Tipi — A personal homeserver for everyone

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-15-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![License](https://img.shields.io/github/license/meienberger/runtipi)](https://github.com/meienberger/runtipi/blob/master/LICENSE)
[![Version](https://img.shields.io/github/v/release/meienberger/runtipi?color=%235351FB&label=version)](https://github.com/meienberger/runtipi/releases)
![Issues](https://img.shields.io/github/issues/meienberger/runtipi)
[![Docker Pulls](https://badgen.net/docker/pulls/meienberger/runtipi?icon=docker&label=pulls)](https://hub.docker.com/r/meienberger/runtipi/)
[![Docker Image Size](https://badgen.net/docker/size/meienberger/runtipi?icon=docker&label=image%20size)](https://hub.docker.com/r/meienberger/runtipi/)
![Build](https://github.com/meienberger/runtipi/workflows/Tipi%20CI/badge.svg)
[![codecov](https://codecov.io/gh/meienberger/runtipi/branch/master/graph/badge.svg?token=FZGO7ZOPSF)](https://codecov.io/gh/meienberger/runtipi)

#### Join the discussion

[![Discord](https://img.shields.io/discord/976934649643294750?label=discord&logo=discord)](https://discord.gg/Bu9qEPnHsc)
[![Matrix](https://img.shields.io/matrix/runtipi:matrix.org?label=matrix&logo=matrix)](https://matrix.to/#/#runtipi:matrix.org)

![Preview](https://raw.githubusercontent.com/meienberger/runtipi/develop/screenshots/appstore.png)

> ⚠️ Tipi is still at an early stage of development and issues are to be expected. Feel free to open an issue or pull request if you find a bug.

Tipi is a personal homeserver orchestrator. It is running docker containers under the hood and provides a simple web interface to manage them. Every service comes with an opinionated configuration in order to remove the need for manual configuration and network setup.

Check our demo instance : **[demo.runtipi.com](https://demo.runtipi.com)** / username: **user@runtipi.com** / password: **runtipi**

## Apps available

- [Adguard Home](https://github.com/AdguardTeam/AdGuardHome) - Adguard Home DNS adblocker
- [Booksonic](https://github.com/popeen) - A server for streaming your audiobooks
- [BookStack](https://www.bookstackapp.com/) - BookStack is a self-hosted platform for organising and storing information.
- [Calibre-Web](https://github.com/janeczku/calibre-web) - Web Ebook Reader
- [Code-Server](https://github.com/coder/code-server) - Web VS Code
- [Filebrowser](https://github.com/filebrowser/filebrowser) - Web File Browser
- [Firefly III](https://github.com/firefly-iii/firefly-iii) - A personal finances manager
- [FreshRSS](https://github.com/FreshRSS/FreshRSS) - A free, self-hostable RSS aggregator
- [Ghost](https://github.com/TryGhost/Ghost) - Ghost - Turn your audience into a business
- [Gitea](https://github.com/go-gitea/gitea) - Gitea - A painless self-hosted Git service
- [Gotify](https://github.com/gotify/server) - Simple server for sending and receiving notification messages.
- [Haven](https://github.com/havenweb/haven) - Haven is a self-hosted private blog and feedreader you can use instead of Facebook
- [Homarr](https://github.com/ajnart/homarr) - A homepage for your server
- [Home Assistant](https://github.com/home-assistant/core) - Open source home automation that puts local control and privacy first
- [Immich](https://www.immich.app/) - Photo and video backup solution directly from your mobile phone
- [Invidious](https://github.com/iv-org/invidious) - An alternative front-end to YouTube
- [Jackett](https://github.com/Jackett/Jackett) - API Support for your favorite torrent trackers
- [Jellyfin](https://github.com/jellyfin/jellyfin) - A media server for your home collection
- [Joplin](https://github.com/laurent22/joplin) - Privacy focused note-taking app
- [Libreddit](https://github.com/spikecodes/libreddit) - Private front-end for Reddit
- [LibrePhotos](https://github.com/LibrePhotos/librephotos) - A self-hosted open source photo management service
- [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate) - Free and open source machine translation API
- [Lidarr](https://github.com/Lidarr/Lidarr) - Looks and smells like Sonarr but made for music
- [Mealie](https://github.com/hay-kot/mealie) - Self-hosted recipe manager and meal planner
- [MoneroBlock](https://github.com/duggavo/MoneroBlock) - Decentralized and trustless Monero block explorer
- [Monero Daemon](https://github.com/sethforprivacy/simple-monerod-docker) - Monero is a private, decentralized cryptocurrency that keeps your finances confidential and secure
- [n8n](https://github.com/n8n-io/n8n) - Workflow Automation Tool
- [Navidrome](https://github.com/navidrome/navidrome/) - Modern Music Server and Streamer compatible with Subsonic/Airsonic
- [Nextcloud](https://github.com/nextcloud/server) - A safe home for all your data
- [Nitter](https://github.com/zedeus/nitter) - Alternative Twitter front-end
- [Node-RED](https://github.com/node-red/node-red) - Low-code programming for event-driven applications
- [Overseerr](https://github.com/sct/overseerr) - Request management and media discovery tool for the Plex ecosystem
- [Photoprism](https://github.com/photoprism/photoprism) - AI-Powered Photos App for the Decentralized Web. We are on a mission to protect your freedom and privacy.
- [Pihole](https://github.com/pi-hole/pi-hole) - A black hole for Internet advertisements
- [Plex](https://github.com/plexinc/pms-docker) - Stream Movies & TV Shows
- [Portainer](https://github.com/portainer/portainer) - Making Docker and Kubernetes management easy
- [PrivateBin](https://github.com/PrivateBin/PrivateBin) - A minimalist, open source online pastebin where the server has zero knowledge of pasted data
- [Prowlarr](https://github.com/Prowlarr/Prowlarr/) - A torrent/usenet indexer manager/proxy
- [ProxiTok](https://github.com/pablouser1/ProxiTok) - Open source alternative frontend for TikTok made using PHP
- [qBittorrent](https://github.com/qbittorrent/qBittorrent) - Fast, easy, and free BitTorrent client
- [Radarr](https://github.com/Radarr/Radarr) - Movie collection manager for Usenet and BitTorrent users
- [Readarr](https://github.com/Readarr/Readarr) - Book Manager and Automation (Sonarr for Ebooks)
- [Resilio Sync](https://github.com/bt-sync) - Fast, reliable, and simple file sync and share solution
- [SearXNG](https://github.com/searxng/searxng) - Privacy-respecting, hackable metasearch engine
- [Send](https://gitlab.com/timvisee/send) - Simple, private file sharing
- [Sonarr](https://github.com/Sonarr/Sonarr) - TV show manager for Usenet and BitTorrent
- [Syncthing](https://github.com/syncthing/syncthing) - Continuous File Synchronization
- [Tailscale](https://github.com/tailscale/tailscale) - The easiest, most secure way to use WireGuard and 2FA
- [Tautulli](https://github.com/Tautulli/Tautulli) - A Python based monitoring and tracking tool for Plex Media Server
- [teddit](https://codeberg.org/teddit/teddit) - Alternative Reddit front-end focused on privacy
- [Transmission](https://github.com/transmission/transmission) - Fast, easy, and free BitTorrent client
- [Tube Archivist](https://github.com/tubearchivist/tubearchivist) - Your self-hosted YouTube media server
- [Uptime Kuma](https://github.com/louislam/uptime-kuma) - A fancy self-hosted monitoring tool
- [Vaultwarden](https://github.com/dani-garcia/vaultwarden) - Unofficial Bitwarden compatible server
- [Wireguard Easy](https://github.com/WeeJeWel/wg-easy) - WireGuard VPN + Web-based Admin UI
- [Your Spotify](https://github.com/Yooooomi/your_spotify) - Self hosted Spotify tracking dashboard
- [Zerotier](https://www.zerotier.com) - Easy to use zero configuration VPN

You can find and submit new apps inside of the [RunTipi Appstore](https://github.com/meienberger/runtipi-appstore).

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

### Custom settings

You can change the default settings by creating a `settings.json` file. The file should be located in the `state` directory. This file will make your changes persist across restarts. Example file:

```json
{
  "dnsIp": "9.9.9.9",
  "domain": "mydomain.com"
}
```

Available settings:

- `dnsIp` - The IP address of the DNS server to use. Default: `9.9.9.9`
- `domain` - The domain name to use for the dashboard. Default: `localhost`
- `port` - The port to use for the dashboard. Default: `80`
- `sslPort` - The port to use for the dashboard with SSL. Default: `443`
- `listenIp` - The IP address to listen on. Default: `automatically detected`
- `storagePath` - The path to use for storing data. Default: `runtipi/app-data`

### Linking a domain to your dashboard

If you want to link a domain to your dashboard, you can do so by providing the `--domain` option in the start script.

```bash
sudo ./scripts/start.sh --domain mydomain.com
```

You can also specify it in the `settings.json` file as shown in the previous section to keep the setting saved across restarts.

A Let's Encrypt certificate will be generated and installed automatically. Make sure to have ports 80 and 443 open on your firewall and that your domain has an **A** record pointing to your server IP.

Please note that this setting will only expose the dashboard. If you want to expose other apps, you need to configure them individually. You cannot use the `--domain` option to expose apps.

This option will only work if you keep the default port 80 and 443 for the dashboard.

### Uninstalling Tipi

Make sure Tipi is completely stopped and then remove the `runtipi` directory.

```bash
sudo ./scripts/stop.sh
cd ..
sudo rm -rf runtipi
```

## 📚 Documentation

You can find more documentation and tutorials / FAQ in the [Wiki](https://github.com/meienberger/runtipi/wiki).

## ❤️ Contributing

Tipi is made to be very easy to plug in new apps. We welcome and appreciate new contributions.

If you want to add a new app or feature, you can follow the [Contribution guide](https://github.com/meienberger/runtipi/wiki/Adding-your-own-app) for instructions on how to do so.

We are looking for contributions of all kinds. If you know design, development, or have ideas for new features, please get in touch.

## 📜 License

[![License](https://img.shields.io/github/license/meienberger/runtipi)](https://github.com/meienberger/runtipi/blob/master/LICENSE)

Tipi is licensed under the GNU General Public License v3.0. TL;DR — You may copy, distribute and modify the software as long as you track changes/dates in source files. Any modifications to or software including (via compiler) GPL-licensed code must also be made available under the GPL along with build & install instructions.

The bash script `app.sh` located in the `scripts` folder contains some snippets from [Umbrel](https://github.com/getumbrel/umbrel)'s code. Therefore some parts of the code are licensed under the PolyForm Noncommercial License 1.0.0 license. You can for now consider the whole file under this license. We are actively working on re-writing those parts in order to make them available under the GPL license like the rest of our code.

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
  <tbody>
    <tr>
      <td align="center"><a href="https://meienberger.dev/"><img src="https://avatars.githubusercontent.com/u/47644445?v=4?s=100" width="100px;" alt="Nicolas Meienberger"/><br /><sub><b>Nicolas Meienberger</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=meienberger" title="Code">💻</a> <a href="#infra-meienberger" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/meienberger/runtipi/commits?author=meienberger" title="Tests">⚠️</a> <a href="https://github.com/meienberger/runtipi/commits?author=meienberger" title="Documentation">📖</a></td>
      <td align="center"><a href="https://github.com/ArneNaessens"><img src="https://avatars.githubusercontent.com/u/16622722?v=4?s=100" width="100px;" alt="ArneNaessens"/><br /><sub><b>ArneNaessens</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=ArneNaessens" title="Code">💻</a> <a href="#ideas-ArneNaessens" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/meienberger/runtipi/commits?author=ArneNaessens" title="Tests">⚠️</a></td>
      <td align="center"><a href="https://github.com/DrMxrcy"><img src="https://avatars.githubusercontent.com/u/58747968?v=4?s=100" width="100px;" alt="DrMxrcy"/><br /><sub><b>DrMxrcy</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=DrMxrcy" title="Code">💻</a> <a href="#ideas-DrMxrcy" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/meienberger/runtipi/commits?author=DrMxrcy" title="Tests">⚠️</a></td>
      <td align="center"><a href="https://cobre.dev"><img src="https://avatars.githubusercontent.com/u/36574329?v=4?s=100" width="100px;" alt="Cooper"/><br /><sub><b>Cooper</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=CobreDev" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/JTruj1ll0923"><img src="https://avatars.githubusercontent.com/u/6656643?v=4?s=100" width="100px;" alt="JTruj1ll0923"/><br /><sub><b>JTruj1ll0923</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=JTruj1ll0923" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/Stetsed"><img src="https://avatars.githubusercontent.com/u/33891782?v=4?s=100" width="100px;" alt="Stetsed"/><br /><sub><b>Stetsed</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=Stetsed" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/blushell"><img src="https://avatars.githubusercontent.com/u/3621606?v=4?s=100" width="100px;" alt="Jones_Town"/><br /><sub><b>Jones_Town</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=blushell" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center"><a href="https://rushichaudhari.github.io/"><img src="https://avatars.githubusercontent.com/u/6279035?v=4?s=100" width="100px;" alt="Rushi Chaudhari"/><br /><sub><b>Rushi Chaudhari</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=rushic24" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/rblaine95"><img src="https://avatars.githubusercontent.com/u/4052340?v=4?s=100" width="100px;" alt="Robert Blaine"/><br /><sub><b>Robert Blaine</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=rblaine95" title="Code">💻</a></td>
      <td align="center"><a href="https://sethforprivacy.com"><img src="https://avatars.githubusercontent.com/u/40500387?v=4?s=100" width="100px;" alt="Seth For Privacy"/><br /><sub><b>Seth For Privacy</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=sethforprivacy" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/hqwuzhaoyi"><img src="https://avatars.githubusercontent.com/u/44605072?v=4?s=100" width="100px;" alt="Prajna"/><br /><sub><b>Prajna</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=hqwuzhaoyi" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/justincmoy"><img src="https://avatars.githubusercontent.com/u/14875982?v=4?s=100" width="100px;" alt="Justin Moy"/><br /><sub><b>Justin Moy</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=justincmoy" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/dextreem"><img src="https://avatars.githubusercontent.com/u/11060652?v=4?s=100" width="100px;" alt="dextreem"/><br /><sub><b>dextreem</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=dextreem" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/iBicha"><img src="https://avatars.githubusercontent.com/u/17722782?v=4?s=100" width="100px;" alt="Brahim Hadriche"/><br /><sub><b>Brahim Hadriche</b></sub></a><br /><a href="https://github.com/meienberger/runtipi/commits?author=iBicha" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center"><a href="https://andrewbrereton.com"><img src="https://avatars.githubusercontent.com/u/682893?v=4?s=100" width="100px;" alt="Andrew Brereton"/><br /><sub><b>Andrew Brereton</b></sub></a><br /><a href="#content-andrewbrereton" title="Content">🖋</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
