# BetterTTS for Vencord

This is a porting of the original BetterDiscord(BD) plugin [BetterTTS](https://github.com/nicola02nb/BetterDiscord-Stuff/tree/main/Plugins/BetterTTS).

A Vencord(VC) plugin that allows you to play a custom TTS when a message is received.

## Features:

-   Enable/Disable `/tts` command
-   Enable/Disable Announce Client join/left channel
-   Enable/Disable Read Messages from channels when recieved

### Mesage Reading:

-   Prepend/Not Prepend Server name before reading messages
-   Prepend/Not Prepend Channel name before reading messages
-   Prepend/Not Prepend Usernames before reading messages
-   Set which name should be read for users
-   Set how URLs should be read
-   Select from which channel TTS should read messages:
    -   Never read messages
    -   Read all messages from all Channels and Servers
    -   From Custom subscribed Channels or Servers
    -   From Connected Channel
    -   From Focused Channel
    -   From Connected Server
    -   From Focused Server
-   Subscribe/Unsubscribe form servers(guilds) and channels (There is a checkbox when you right click them)

## TTS Sources:

You can select:

-   The TTS Audio Source:
-   The Voice Type and Languages

Sources Available:

-   Discord Default TTS
-   Streamelements API (About 206 Voices)
-   Some TikTok voices

### Block Filters:

Block messages from:

-   Blocked users
-   Ignored users
-   Not firends users
-   Muted channels
-   Muted servers
-   Muted users (There is a checkbox when you right click them)

### Other

-   Adjust Volume
-   Select Speech Rate
-   Play an audio preview
-   Select Delay between Messages
-   Set a Keyboard Shortcut to Toggle TTS On/Off (With toast)
