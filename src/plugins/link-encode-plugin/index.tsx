/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { settings } from "./settings";
import { setShouldShowEncodeEnabledTooltip, LinkEncodeChatBarIcon, LinkEncodeIcon } from "./LinkEncodeIcon";
import { handleDecrypt, LinkEncodeAccessory } from "./LinkEncodeAccessory";
import { decryptMessage, encryptMessage, formatEncryptedMessage, parseEncryptedMessage } from "./utils";

// Memoize message content extraction to avoid repeated lookups
function getMessageContent(message: Message): string {
    if (message.content) return message.content;
    if (message.messageSnapshots?.[0]?.message.content) return message.messageSnapshots[0].message.content;
    const embed = message.embeds?.find(embed => embed.type === "auto_moderation_message");
    return embed?.rawDescription || "";
}

// Shared decrypt handler to avoid code duplication
function handleDecryptMessage(messageId: string, encrypted: string, key: string): void {
    try {
        const decrypted = decryptMessage(encrypted, key);
        handleDecrypt(messageId, { text: decrypted });
    } catch (error) {
        // Error is thrown from decryptMessage with proper message
        console.error("[LinkEncode] Failed to decrypt message:", error);
    }
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const content = getMessageContent(message);
    if (!content) return;

    const parsed = parseEncryptedMessage(content, settings.store.stealthMode);
    if (!parsed) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-link-decrypt"
            label="Decrypt Message"
            icon={LinkEncodeIcon}
            action={() => handleDecryptMessage(message.id, parsed.encrypted, parsed.key)}
        />
    ));
};

let tooltipTimeout: ReturnType<typeof setTimeout> | undefined;

export default definePlugin({
    name: "Message Encryption",
    description: "Encrypt your messages to bypass Discord's automated link filtering. Uses XOR cipher with unique keys per message, sent in a stealth format that appears as normal chat.",
    authors: [{ name: "Your Name", id: 0n }], // Replace with your Discord user ID
    settings,
    contextMenus: {
        "message": messageCtxPatch
    },

    renderMessageAccessory: props => <LinkEncodeAccessory message={props.message} />,

    chatBarButton: {
        icon: LinkEncodeIcon,
        render: LinkEncodeChatBarIcon
    },

    messagePopoverButton: {
        icon: LinkEncodeIcon,
        render(message: Message) {
            const content = getMessageContent(message);
            if (!content) return null;

            const parsed = parseEncryptedMessage(content, settings.store.stealthMode);
            if (!parsed) return null;

            return {
                label: "Decrypt Message",
                icon: LinkEncodeIcon,
                message,
                onClick: () => handleDecryptMessage(message.id, parsed.encrypted, parsed.key)
            };
        }
    },

    async onBeforeMessageSend(_, message) {
        if (!settings.store.autoEncode || !message.content) return;

        setShouldShowEncodeEnabledTooltip?.(true);
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => setShouldShowEncodeEnabledTooltip?.(false), 2000);

        const encrypted = encryptMessage(message.content);
        message.content = formatEncryptedMessage(encrypted.encrypted, encrypted.key, settings.store.stealthMode);
    }
});
