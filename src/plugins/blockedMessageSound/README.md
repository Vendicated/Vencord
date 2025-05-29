# BlockedMessageSound

A Vencord plugin that plays a custom sound whenever you receive a message from a blocked user.

## Features
- Play a custom MP3 (or other audio) file when a blocked user sends a message
- Adjustable playback volume
- Option to disable sound while in Do Not Disturb mode
- Simple file picker UI for selecting your sound file

## Installation
1. Place the `blockedMessageSound` folder in your Vencord `src/plugins` directory.
2. Build or reload your Vencord plugins as usual.

## Usage
1. Open Vencord settings and find the **BlockedMessageSound** plugin.
2. Enable the plugin if it is not already enabled.
3. In the plugin settings:
   - Click **Select File** to choose an MP3 or other audio file from your computer.
   - Adjust the **Volume** slider as desired.
   - Toggle **Play in Do Not Disturb** if you want the sound to play even when your status is DND.
4. When a blocked user sends you a message, your selected sound will play.

## Notes
- The plugin stores both the audio data and the file name for your selected sound.
- Only one sound file can be set at a time. To change it, simply select a new file.
- To remove the sound, select a blank or invalid file, or clear the setting in the plugin's code.

## Troubleshooting
- If the sound does not play, ensure your file is a valid audio file (preferably MP3).
- Make sure your system volume and Discord's volume are not muted.
- If you encounter issues, check the developer console for debug logs.

## License
GPL-3.0-or-later

---
**Maintained by:** Zekerocks11 and the Vencord community
