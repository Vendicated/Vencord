# vc-message-logger-enhanced

## What is this?

This is a third-party-plugin for [Vencord](https://vencord.dev/) that logs messages, images, and ghost pings in Discord.
The plugin saves messages to a json file, and can restore them after reloading Discord.

## Features

-   Restore deleted and edited messages even after reloading Discord (optional).
-   Log messages from channels or DMs you haven't opened.
-   Save deleted images
-   View logs in a modal that shows your logged messages.
    -   Sort messages based on timestamps.
    -   Search logs by channel ID, user ID, server ID, and message ID.
    -   Ghost Pinged tab to track and view ghost pings.
-   Set a message limit to manage the number of saved logs (settings).
-   Blacklist servers, channels, and users to prevent logging specific content.
-   Whitelist feature to selectively allow logging for specific servers, channels, or users.
-   Whitelist overrides server blacklist, allowing logging of whitelisted users' actions in blacklisted servers and channels.
-   Export logs for backup and analysis purposes.
-   Import logs to restore previous logging data.

> [!NOTE]
> The "Cache Messages From Servers" Option basically treats all servers as whitelisted if its not blacklisted. If you have a lot of servers, this can cause a lot of messages to be logged.

# How to Install

tutorial: https://youtu.be/8wexjSo8fNw

# How to manually update

https://github.com/Syncxv/vc-message-logger-enhanced/assets/47534062/31be3fcb-71db-4714-9d94-99b340371e96

# Changelog

## 4.0.0
- Moved from JSON to IndexedDB
- Support all attachments types (videos, audio, etc)
- Import logs now doensn't overwrite existing logs
- Fix Image Rendering

## 3.0.1
- Delete message without it being logged by other message loggers (by [@redbaron2k7](https://github.com/redbaron2k7))

## 3.0.0

- Added updater

## 2.0.4

- Fix always log current channel
- Fix channel reloading due to invalid attachments
- Started storing deleted timestamps

## 2.0.2

-   Fix image saving
-   Improve security

## 2.0.0

-   Use native api
-   save logs to a real file
-   fix some image bugs

## Version 1.4.0

-   Save Images :D

## Version 1.3.2

-   Fixed Modal and Toolbox Icon
-   Made update message less confusing https://github.com/Syncxv/vc-message-logger-enhanced/issues/2

## Version 1.3.1

-   Added option to always log Direct Messages by [@CatGirlDShadow](https://github.com/CatGirlDShadow) in https://github.com/Syncxv/vc-message-logger-enhanced/pull/1
-   Added option to always log Selected Channel by [@CatGirlDShadow](https://github.com/CatGirlDShadow) in https://github.com/Syncxv/vc-message-logger-enhanced/pull/1
-   Added option to ignore muted Categories by [@CatGirlDShadow](https://github.com/CatGirlDShadow) in https://github.com/Syncxv/vc-message-logger-enhanced/pull/1
-   Added option to ignore muted Channels by [@CatGirlDShadow](https://github.com/CatGirlDShadow) in https://github.com/Syncxv/vc-message-logger-enhanced/pull/1

## Version 1.3.0

-   Log bulk deleted messages (feat)
-   Ignore muted guild option (feat)
-   Fix Limits not working (fix)
-   Fix message limit not working (fix)

most of the big exams are over :D
can finally go back to makin tuff

## Version 1.2.0

-   Render Embeds in logs modal :D

## Version 1.1.0

-   Added Whitelist feature
-   Improved message caching:
    -   Graylisted messages that aren't cached by Discord won't be saved
-   Added Ghost Ping Tab
-   Improved searching functionality:
    -   Can now search by names in addition to existing search options
-   Added an automatic update check feature
-   Improved modal performance for better user experience

# Demo

https://github.com/Syncxv/vc-message-logger-enhanced/assets/47534062/de932bff-91fe-4825-8ef7-551cf245e51a

## found a bug?

Message me on discord. @daveyy1
