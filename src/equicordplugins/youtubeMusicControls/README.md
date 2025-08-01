# YouTubeMusicControls

Adds a YouTube Music player above the account panel.
Shows the current playing playing track and adds controls same,
basicly the same as SpotifyControls

# Prerequirements

This only works with [th-ch's YouTube Music](https://github.com/th-ch/youtube-music)  
and my plugin [ApiWebsocket Plugin](https://github.com/Johannes7k75/youtube-music/tree/feat/api-websocket) installed (Currently not included in [th-ch's YouTube Music](https://github.com/th-ch/youtube-music))  
Plugins that have to be enabled
- API Server 
- API Websocket

# Installation
- [git](https://git-scm.com/downloads)
- [node.js](https://nodejs.org/en/download) >= 22.12.0
- [pnpm](https://pnpm.io/installation) 

```bash
git clone https://github.com/th-ch/youtube-music
cd .\youtube-music\
git remote add johannes https://github.com/Johannes7k75/youtube-music.git
git fetch johannes
git merge johannes/feat/api-websocket
pnpm install --frozen-lockfile
pnpm dist:win
```


See the [forum thread](https://discord.com/channels/1015060230222131221/1257038407503446176/1257038407503446176) / [Vencord docs](https://docs.vencord.dev/installing/custom-plugins/)