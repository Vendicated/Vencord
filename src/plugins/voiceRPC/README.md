# VoiceRPC

A Vencord plugin that adds a custom Rich Presence (RPC) status when you join a voice channel.

## Features

- **Real-time Voice Tracking:** Automatically updates your Discord status as you join, move, or leave voice channels.
- **Dynamic Activity Name:** Shows `Playing In Voice Chat (Channel Name)`.
- **Server Visibility:** Displays the current server (Guild) name in the status details.
- **Member Awareness:** 
  - Shows the names of people you are with (if 1 or 2 others).
  - Shows a member count (e.g., `With 5 others`) if the channel is busy.
- **Clean Visuals:** Uses a dedicated microphone icon for the status image.
- **Performance Optimized:** Includes a debounced update mechanism to prevent rate-limiting and ensure smooth performance.

## Preview

The RPC structure follows this format:
- **Header:** In Voice Chat (Channel Name)
- **Line 1:** [Server Name]
- **Line 2:** With [User1, User2] / With [X] others
- **Footer:** 🎮 00:00

## Author

- **Pankaj** (Devs.Pankaj)

## Setting

- **Comming Soon**