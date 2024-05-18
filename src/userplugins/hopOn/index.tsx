/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore, SelectedChannelStore } from "@webpack/common";
import { Message } from "discord-types/general";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    channelId: string;
    message: Message;
}

const settings = definePluginSettings({
    regex: {
        type: OptionType.STRING,
        description: "Regex to trigger on",
        default: "hop on (?:fortnite|fn)"
    },
    url: {
        type: OptionType.STRING,
        description: "URL to open",
        default: "com.epicgames.launcher://apps/fn%3A4fe75bbc5a674f4f9b356b5c90567da5%3AFortnite?action=launch&silent=true"
    }
});
export default definePlugin({
    name: "Hop On",
    description: "Hop on Fortnite or Hop on bloons :3",
    authors: [Devs.ImLvna],
    settings,
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (RelationshipStore.isBlocked(message.author?.id)) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;
            if (!message.content?.match(new RegExp(settings.store.regex, "i"))) return;

            VencordNative.native.openExternal(settings.store.url);
        }
    }
});
