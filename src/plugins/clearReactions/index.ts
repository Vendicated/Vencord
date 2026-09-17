/*
 * Vencord plugin: ClearReactions
 * Copyright (c) 2026 Kyuvie
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "../../utils/types";
import { Channel, Message } from "@vencord/discord-types";
import { FluxDispatcher, PermissionsBits, PermissionStore, RestAPI, showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    modifier: {
        type: OptionType.SELECT,
        description: "Which modifier key to hold while clicking a message to clear its reactions",
        options: [
            { label: "Shift", value: "shift", default: true },
            { label: "Ctrl", value: "ctrl" },
            { label: "Alt", value: "alt" },
        ],
    },
    notifications: {
        type: OptionType.BOOLEAN,
        description: "Show a toast when reactions are cleared (or when it fails)",
        default: true,
    },
});

export default definePlugin({
    name: "ClearReactions",
    description: "Hold a modifier key and click a message to remove all of its reactions. Requires the Manage Messages permission",
    tags: ["Chat", "Reactions", "Shortcuts"],
    authors: [{ name: "Kyuvie", id: 1055054298033164289n }],

    settings,

    onMessageClick(msg: Message, channel: Channel, event: MouseEvent) {
        if (event.detail > 1) return;
        if (!channel.guild_id) return;
        if (msg.deleted === true) return;

        const modifier = settings.store.modifier;
        const modifierPressed = modifier === "shift" ? event.shiftKey
            : modifier === "ctrl" ? event.ctrlKey
                : event.altKey;

        if (!modifierPressed) return;
        if (!msg.reactions?.length) return;

        if (!PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel)) {
            if (settings.store.notifications) {
                showToast("You need the Manage Messages permission to clear reactions", Toasts.Type.FAILURE);
            }
            return;
        }

        event.preventDefault();

        RestAPI.del({ url: `/channels/${channel.id}/messages/${msg.id}/reactions` })
            .then(() => {
                FluxDispatcher.dispatch({
                    type: "MESSAGE_REACTION_REMOVE_ALL",
                    channelId: channel.id,
                    messageId: msg.id,
                    guildId: channel.guild_id,
                });

                if (settings.store.notifications) {
                    showToast("Reactions cleared", Toasts.Type.SUCCESS);
                }
            })
            .catch((error: any) => {
                if (settings.store.notifications) {
                    showToast("Failed to clear reactions: " + (error?.body?.message ?? error?.message ?? "unknown error"), Toasts.Type.FAILURE);
                }
            });
    },
});
