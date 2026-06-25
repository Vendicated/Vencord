/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, DraftStore, DraftType, Menu, showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    autoAddNewline: {
        type: OptionType.BOOLEAN,
        description: "Automatically insert a new line before pasting if the chatbox isnt empty.",
        default: true
    }
});

const QuoteIcon: IconComponent = ({ height = 24, width = 24, className }) => (
    <svg
        width={width}
        height={height}
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M9.983 3v7.391C9.983 16.069 6.25 21 2 21v-2.32c2.784 0 5.488-3.08 5.488-8.289H2V3h7.983zm12.017 0v7.391c0 5.678-3.733 10.609-7.983 10.609v-2.32c2.784 0 5.488-3.08 5.488-8.289h-5.488V3h7.983z"/>
    </svg>
);

function quoteMessageText(message: Message) {
    const textToQuote = message.content?.trim();
    if (!textToQuote) {
        showToast("This message has no text to quote!", Toasts.Type.FAILURE);
        return;
    }
    let prefix = "";
    if (settings.store.autoAddNewline) {
        const currentDraft = DraftStore.getDraft(message.channel_id, DraftType.ChannelMessage) || "";
        if (currentDraft.trimEnd().length > 0) {
            prefix = currentDraft.endsWith("\n") ? "" : "\n";
        }
    }
    insertTextIntoChatInputBox(`${prefix}>${textToQuote}`);
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message }) => {
    if (!message.content?.trim()) return;
    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;
    const insertIndex = group.findIndex(c => c?.props?.id === "copy-text") + 1;
    group.splice(insertIndex, 0, (
        <Menu.MenuItem
            id="vc-quote-message"
            label="Quote Message"
            icon={QuoteIcon}
            action={() => quoteMessageText(message)}
        />
    ));
};

export default definePlugin({
    name: "QuoteMessage",
    description: "Quickly quote a message via a button",
    authors: [{ id: 994819569795485747n, name: "hieuxyz" }],
    tags: ["Chat", "Utility"],

    dependencies: ["MessagePopoverAPI", "ContextMenuAPI"],
    settings,

    contextMenus: {
        "message": messageCtxPatch
    },

    messagePopoverButton: {
        icon: QuoteIcon,
        render(message: Message) {
            if (!message.content?.trim()) return null;
            return {
                label: "Quote Message",
                icon: QuoteIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => quoteMessageText(message)
            };
        }
    }
});