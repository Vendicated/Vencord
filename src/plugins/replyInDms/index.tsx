/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 lzcunt
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { ReplyIcon } from "@components/Icons";
import { insertTextIntoChatInputBox, openPrivateChannel, sendMessage } from "@utils/discord";
import { sleep } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { MessageReferenceType } from "@vencord/discord-types/enums";
import { ChannelStore, ComponentDispatch, Menu, RelationshipStore, SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    nativeForwards: {
        description: "Send a native forward instead of filling the input with a quote. Native forwards send immediately.",
        type: OptionType.BOOLEAN,
        default: false
    },
    hideBots: {
        description: "Hide the button on messages sent by bots.",
        type: OptionType.BOOLEAN,
        default: false
    }
});

function canReplyInDms(message: Message) {
    const { author } = message;
    if (author.id === UserStore.getCurrentUser().id) return false;
    if (author.system) return false;
    if (message.webhookId || author.isNonUserBot()) return false;
    if (RelationshipStore.isBlocked(author.id)) return false;
    if (author.bot && settings.store.hideBots) return false;

    const dmChannelId = ChannelStore.getDMFromUserId(author.id);

    // If we're already in the author's DMs we can just reply normally.
    if (dmChannelId && SelectedChannelStore.getChannelId() === dmChannelId) return false;

    return true;
}

function buildQuote(message: Message) {
    const source = message.messageSnapshots[0]?.message ?? message;
    const lines = [`> *Forwarded from <#${message.channel_id}>*`];

    if (source.content)
        lines.push(...source.content.split("\n").map(line => `> ${line}`));
    else
        lines.push(`${window.location.origin}/channels/${ChannelStore.getChannel(message.channel_id)?.guild_id ?? "@me"}/${message.channel_id}/${message.id}`);

    return lines.join("\n") + "\n\n";
}

async function replyInDms(message: Message) {
    const authorId = message.author.id;

    const opened = await Promise.resolve(openPrivateChannel(authorId, true));
    let channelId = typeof opened === "string" ? opened : ChannelStore.getDMFromUserId(authorId);

    for (let i = 0; !channelId && i < 20; i++) {
        await sleep(150);
        channelId = ChannelStore.getDMFromUserId(authorId);
    }

    if (!channelId) {
        showToast("Could not open a DM with that user.", Toasts.Type.FAILURE);
        return;
    }

    if (settings.store.nativeForwards) {
        const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;

        await sendMessage(channelId, {}, true, {
            messageReference: {
                type: MessageReferenceType.FORWARD,
                message_id: message.id,
                channel_id: message.channel_id,
                guild_id: guildId
            },
            allowedMentions: { parse: [], replied_user: false }
        });
        return;
    }

    for (let i = 0; SelectedChannelStore.getChannelId() !== channelId && i < 40; i++)
        await sleep(50);
    await sleep(150);

    insertTextIntoChatInputBox(buildQuote(message));
    ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message || !canReplyInDms(message)) return;

    const item = (
        <Menu.MenuItem
            id="vc-reply-in-dms"
            label="Reply Privately"
            leadingAccessory={{ type: "icon", icon: ReplyIcon }}
            action={() => replyInDms(message)}
        />
    );

    const group = findGroupChildrenByChildId("reply", children);
    if (group) {
        group.splice(group.findIndex(c => c?.props?.id === "reply") + 1, 0, item);
    } else {
        children.push(<Menu.MenuGroup>{item}</Menu.MenuGroup>);
    }
};

export default definePlugin({
    name: "ReplyInDMs",
    description: "Adds a context menu option to reply to a message privately (in the author's DMs).",
    tags: ["Chat", "Utility"],
    searchTerms: ["dm", "dms", "direct message", "reply privately", "replyprivately"],
    authors: [{ name: "lzcunt", id: 326359466171826176n }],
    dependencies: ["MessagePopoverAPI"],
    settings,

    messagePopoverButton: {
        icon: ReplyIcon,
        render(message) {
            if (!canReplyInDms(message)) return null;

            return {
                label: "Reply Privately",
                icon: ReplyIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => replyInDms(message)
            };
        }
    },

    contextMenus: {
        "message": messageContextMenuPatch,
        "message-actions": messageContextMenuPatch
    }
});
