# Sound Panel

Adds a button to the voice controls that opens a panel for playing sounds and music into the call.

- **Soundboard**: every soundboard sound you can use, grouped by server, with favorites and search. Sounds Discord's soundboard can't play here play through your microphone instead
- **My Sounds**: your own sound effects, with per-sound volume, renaming and favorites
- **Music**: a playlist with shuffle, repeat and seeking. Paste a YouTube link to download its audio into the playlist
- **Join sound**: plays a sound of your choice when you join a voice channel
- Separate volumes for what others hear and what you hear

## Usage
- Enable this plugin and join a voice channel
- Click the Sound Panel button at the end of the voice buttons
- On the desktop app, turn on **Webrtc Engine** in the plugin settings and restart Discord so others hear your own sounds and music

## YouTube links
The first time you add a link, the plugin downloads [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [QuickJS-NG](https://github.com/quickjs-ng/quickjs) from their official GitHub releases, checks their checksums and keeps them in Vencord's data folder. If Node.js 20 or newer is installed, yt-dlp uses it instead of QuickJS-NG.

Screenshots and a full guide: [cegged/Sound-Panel](https://github.com/cegged/Sound-Panel)
