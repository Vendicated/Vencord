# SilentDelete
Vencord plugin that deletes messages while bypassing Vencord's message logger.

## How it works
Due to a current Discord client-side issue, sending a new message with its nonce set to the ID of a previously sent message causes the new message to visually replace the original. The original message is not deleted server-side, but it becomes hidden on the client.

SilentDelete exploits this behavior to allow "silent" message deletion:

1. When you delete a message, the plugin sends a new message with placeholder text (like `** **`) using the original message's ID as the nonce.
2. This causes the new placeholder message to visually replace the original in the client without triggering Vencord's message logger.
3. The placeholder message is then deleted after a short delay.
4. By default, the plugin also deletes the original server-side message to prevent it from reappearing after client reload.

This bypasses message loggers that track deletions, as the message appears to get replaced with placeholder text and then removed.

Also see [SilentEdit](https://github.com/aurickk/SilentEdit-Vencord) that uses the same nonce exploit but to conveniently "silent" edit a message.

> [!WARNING]
> This plugin violates Discord's Terms of Service. Using client modifications and automating message actions can result in account termination. Use at your own risk.

## Installation

Because this is not an official Vencord plugin, you must build Vencord with the plugin from source before injecting Discord.

1. Install [Node.js](https://nodejs.org/en), [git](https://git-scm.com/install/), and [pnpm](https://pnpm.io/installation) if missing.

2. Clone Vencord's Github repository:
```sh
git clone https://github.com/Vendicated/Vencord
cd Vencord
pnpm install --frozen-lockfile
```
3. Navigate to the `src` folder in the cloned Vencord repository, create a new folder called `userplugins` if it dosen't already exist.

3. Download `silentDelete.tsx` from the repository and move it to the `userplugins` folder.

4. Build Vencord and inject Discord:

```sh
pnpm build
pnpm inject
```
5. If built and injected successfully, follow the remaining prompt(s) and restart Discord to apply changes.
6. In Discord's Vencord plugins menu, enable the SilentDelete Plugin.

[Offical Vencord custom plugin installation guide](https://docs.vencord.dev/installing/custom-plugins/)

## Usage

### Deleting a Single Message

1. Hover over your message

<img width="616" src="https://github.com/user-attachments/assets/3c55f07a-5cdd-49db-b598-f501eb788370" />

2. Click the **Silent Delete** button in the popover menu (trash icon)

<img width="616" src="https://github.com/user-attachments/assets/f1f049d0-a3fc-4a3d-addc-d58bac4ccee8" />


### Removing Deleted Message History  

1. Right-click on a message you've already deleted

<img width="830" src="https://github.com/user-attachments/assets/e0d4d06f-dba1-46d7-8d9c-674ec7f58c8e" />

2. Select **Silent Delete History** from the context menu


### Silent Purge Messages

1. Execute the command `/silentpurge` with the number of messages to silently delete in the `count` field.

<img width="830" src="https://github.com/user-attachments/assets/dc3580aa-9c88-4042-aab0-2c21000b4284" />

## Settings

### Replacement Text

The text that replaces your message before deletion (default: `** **`)

### Delete Delay

How long to wait before deleting the replacement message in milliseconds (recommended: 100-500ms, default: 200ms)

### Suppress Notifications

Prevents pinging mentioned users when replacing the message (default: enabled)

### Delete Original

Whether to delete the original message from the server. If disabled, the original message will reappear on client restart (default: enabled)

### Purge Interval 
Delay between each message deletion during `/silentpurge` in milliseconds (recommended: 500-1000ms to avoid rate limits, default: 500ms)

### Accent Color
Hex color code for the Silent Delete icon and menu text (default: `#ed4245`)

# Credits

Skidded from [applefritter's AntiLog plugin](https://github.com/applefritter-inc/AntiLog)
