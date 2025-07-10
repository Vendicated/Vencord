/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { showItemInFolder } from "@utils/native";
import definePlugin, { OptionType } from "@utils/types";
import { saveFile } from "@utils/web";
import { Message } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

const settings = definePluginSettings({
    openFileAfterExport: {
        type: OptionType.BOOLEAN,
        description: "Open the exported file in the default file handler after export",
        default: true
    }
});

function formatMessage(message: Message) {
    const { author } = message;
    const timestamp = new Date(message.timestamp.toString()).toLocaleString();

    let content = `[${timestamp}] ${author.username}`;
    if (author.discriminator !== "0") {
        content += `#${author.discriminator}`;
    }
    content += `: ${message.content}`;

    if (message.attachments?.length > 0) {
        content += "\n  Attachments:";
        message.attachments.forEach(attachment => {
            content += `\n    - ${attachment.filename} (${attachment.url})`;
        });
    }

    if (message.embeds?.length > 0) {
        content += "\n  Embeds:";
        message.embeds.forEach(embed => {
            if (embed.rawTitle) content += `\n    Title: ${embed.rawTitle}`;
            if (embed.rawDescription) content += `\n    Description: ${embed.rawDescription}`;
            if (embed.url) content += `\n    URL: ${embed.url}`;
        });
    }

    return content;
}

async function exportMessage(message: Message) {
    const timestamp = new Date(message.timestamp.toString()).toISOString().split("T")[0];
    const filename = `message-${message.id}-${timestamp}.txt`;

    const content = formatMessage(message);

    try {
        if (IS_DISCORD_DESKTOP) {
            const data = new TextEncoder().encode(content);
            const result = await DiscordNative.fileManager.saveWithDialog(data, filename);

            if (result && settings.store.openFileAfterExport) {
                showItemInFolder(result);
            }
        } else {
            const file = new File([content], filename, { type: "text/plain" });
            saveFile(file);
        }

        showNotification({
            title: "Export Messages",
            body: `Message exported successfully as ${filename}`,
            icon: "📄"
        });
    } catch (error) {
        showNotification({
            title: "Export Messages",
            body: "Failed to export message",
            icon: "❌"
        });
    }
}

const messageContextMenuPatch = (children: Array<React.ReactElement<any> | null>, props: { message: Message; }) => {
    const { message } = props;

    if (!message) return;

    children.push(
        <Menu.MenuItem
            id="export-message"
            label="Export Message"
            icon={() => (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
            )}
            action={() => exportMessage(message)}
        />
    );
};

export default definePlugin({
    name: "ExportMessages",
    description: "Allows you to export any message to a file",
    authors: [EquicordDevs.veygax],
    settings,
    contextMenus: {
        "message": messageContextMenuPatch
    }
});
