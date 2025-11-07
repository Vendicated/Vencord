# protexBlocks

This plugin automatically checks users against the ProteX blocks pulled from GitHub.

## Features

- Checks users against public blocks at [NexusProjectsEU/blocks](https://github.com/NexusProjectsEU/blocks)
- No API key required - uses public GitHub repository
- Performance optimization by only checking each user once per session
- Displays block status directly in chat

## Settings

- **Check Once**: Only check each user once per session for better performance (default: enabled)

## How it works

The plugin checks the public GitHub repository for blocked users. When a blocked user sends a message, a warning indicator appears below their message showing they are blocked by ProteX.

## What is Protex?

An intelligent security and moderation bot designed to keep your server safe, organized and free from bad behavior. With focus on automation, user-friendliness and flexibility.
