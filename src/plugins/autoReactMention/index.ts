/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RestAPI, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    emoji: {
        type: OptionType.STRING,
        description: "Unicode emoji (👍) or custom (name:id)",
        default: "",
        placeholder: "👍 or pepeping:1447716977375313920"
    }
});

export default definePlugin({
    name: "AutoReactMention",
    description: "Automatically reacts to messages where you are mentioned with a configurable emoji",
    authors: [Devs.lucauy],
    tags: ["Chat", "Reactions", "Fun"],
    settings,

    flux: {
        MESSAGE_CREATE({ message }) {
            const emoji = settings.store.emoji?.trim();
            if (!emoji) return;

            const currentUserId = UserStore.getCurrentUser()?.id;
            if (!currentUserId) return;

            const mentioned = message.mentions?.some((m: any) => m.id === currentUserId || m === currentUserId);
            if (!mentioned) return;

            if (message.author?.id === currentUserId) return;

            const emojiIdentifier = emoji.includes(":") ? emoji : encodeURIComponent(emoji);

            RestAPI.put({
                url: `/channels/${message.channel_id}/messages/${message.id}/reactions/${emojiIdentifier}/@me`,
                auth: true
            }).catch(() => { });
        }
    }
});
