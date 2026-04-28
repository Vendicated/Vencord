# SilentEdit
Vencord plugin that edit messages without showing the edit tag and bypasses Vencord's message logger.

## How it works
Due to a current Discord client-side issue, sending a new message with its nonce set to the ID of a previously sent message causes the new message to visually replace the original. The original message is not deleted server-side, but it becomes hidden on the client. 

SilentEdit exploits this behavior to allow "silent" message editing:
1. When you edit a message, the plugin sends a new message with the edited content using the original message's ID as the nonce.
2. This causes the new message to visually replace the original in the client without triggering Discord's edit system or Vencord message logger.
3. Optionally, the plugin can delete the original server-side message to prevent it from reappearing on client reload.

This bypasses message loggers that track edits, as the message appears to have never been edited from the logger's perspective.

Also see [SilentDelete](https://github.com/aurickk/SilentDelete-Vencord) that uses the same nonce exploit but to silently delete a message.

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

3. Download `silentEdit.tsx` from the repository and move it to the `userplugins` folder.

4. Build Vencord and inject Discord:

```sh
pnpm build
pnpm inject
```
5. If built and injected successfully, follow the remaining prompt(s) and restart Discord to apply changes.
6. In Discord's Vencord plugins menu, enable the SilentEdit Plugin.

[Offical Vencord custom plugin installation guide](https://docs.vencord.dev/installing/custom-plugins/)

## Usage
Make sure you have the SilentEdit plugin enabled under Vencord plugins.

1. Hover over a message you sent that you wish to silently edit.

<img width="821" src="https://github.com/user-attachments/assets/5d104f31-1f59-43cb-bfe3-1165055712ce" />

2. Click the "Silent Edit" red pencil icon in the message popover menu.

3. Discord's native edit interface will open - edit your message as normal and press Enter.

<img width="821" src="https://github.com/user-attachments/assets/5707ae38-2bc4-4d5c-9cbd-3a549c76e60f" />

5. The message will be silently edited without showing the "(edited)" and does not appear on Vencord message logger. Additionally, the server-side original will be handled according to your settings.

<img width="821" src="https://github.com/user-attachments/assets/da48788e-c4f1-4cea-9616-c2b8e90ff4f4" />

<sub>Note: The edited message will be chronologically re-ordered after client reload.</sub>

## Settings

### Delete Original Message
When enabled (default), the original server-side message will be deleted after the silent edit is performed. This prevents the original message from reappearing when the client reloads. Note that message logger bots would capture the deleted server-side message, which exposes your original message.

**Note:** When disabled, the original message will reappear in its original position after client reload, and the silently edited message will appear as a separate message at the bottom of the channel.

### Delete Delay
The wait time (in milliseconds) before deleting the original message. Default is 500ms. This ensures the new message is sent before the original is deleted.

### Suppress Notifications
Recommended for use in DMs to prevent pinging users. When enabled, the silently edited message is sent with the `SUPPRESS_NOTIFICATIONS` flag (equivalent to using `@silent` in Discord), which prevents users from being pinged when the edit occurs.

### Accent Color
Hex color code for the Silent Delete icon and menu text (default: `#ed4245`)
