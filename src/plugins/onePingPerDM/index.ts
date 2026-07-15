/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageJSON } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelStore, FluxDispatcher, ReadStateStore, UserStore } from "@webpack/common";

const pingedReactionChannels = new Set<string>();

const settings = definePluginSettings({
    affectDMs: {
        type: OptionType.BOOLEAN,
        description: "Limit repeated notifications in DMs (1-on-1)",
        default: true,
    },
    affectGroupDMs: {
        type: OptionType.BOOLEAN,
        description: "Limit repeated notifications in group DMs",
        default: true,
    },
    affectServers: {
        type: OptionType.BOOLEAN,
        description: "Limit repeated notifications in server channels",
        default: true,
    },
    allowMentions: {
        type: OptionType.BOOLEAN,
        description: "Always receive a ping for direct @mentions",
        default: false,
    },
    allowEveryone: {
        type: OptionType.BOOLEAN,
        description: "Always receive a ping for @everyone and @here",
        default: false,
    },
});

export default definePlugin({
    name: "OnePingPerChannel",
    description: "If multiple unread messages or reactions arrive in the same channel (DM, group, or server), you'll only get one ping. Reading the messages resets the limit.",
    tags: ["Notifications", "Customisation"],
    authors: [Devs.ProffDea],
    settings,
    patches: [
        {
            find: ".getDesktopType()===",
            replacement: [
                {
                    match: /(\i\.\i\.getDesktopType\(\)===\i\.\i\.NEVER)\)/,
                    replace: "$&if(!$self.shouldPing(arguments[0]?.message))return;else "
                },
                {
                    match: /\i\(\i\),\i\.\i\.showNotification\(\i,\i,\i,\{notif_type:"MESSAGE_CREATE"/,
                    replace: "if(!$self.shouldPing(arguments[0]?.message))return;$&"
                },
                {
                    match: /\i\.\i\.showNotification\(\i,\i,\i,\{notif_type:\i,notif_user_id:\i,message_id:\i\.id\}/,
                    replace: "if(!$self.shouldPingReaction(arguments[0]?.message))return;$&"
                }
            ]
        }
    ],
    start() {
        FluxDispatcher.subscribe("MESSAGE_ACK", this.onMessageAck);
    },
    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_ACK", this.onMessageAck);
    },
    onMessageAck({ channelId }: { channelId: string; }) {
        pingedReactionChannels.delete(channelId);
    },
    shouldPing(message: MessageJSON) {
        const channelType = ChannelStore.getChannel(message.channel_id)?.type;
        const isDM = channelType === ChannelType.DM;
        const isGroupDM = channelType === ChannelType.GROUP_DM;
        const isServerChannel = !isDM && !isGroupDM;

        if (
            (isDM && !settings.store.affectDMs) ||
            (isGroupDM && !settings.store.affectGroupDMs) ||
            (isServerChannel && !settings.store.affectServers) ||
            (settings.store.allowMentions && message.mentions.some(m => m.id === UserStore.getCurrentUser().id)) ||
            (settings.store.allowEveryone && message.mention_everyone)
        ) {
            return true;
        }

        return ReadStateStore.getOldestUnreadMessageId(message.channel_id) === message.id;
    },
    // Reactions aren't tied to an "unread message" like normal messages, so we track
    // per-channel whether a reaction ping has already fired since the channel was last read.
    shouldPingReaction(message: MessageJSON) {
        const channelType = ChannelStore.getChannel(message.channel_id)?.type;
        const isDM = channelType === ChannelType.DM;
        const isGroupDM = channelType === ChannelType.GROUP_DM;
        const isServerChannel = !isDM && !isGroupDM;

        if (
            (isDM && !settings.store.affectDMs) ||
            (isGroupDM && !settings.store.affectGroupDMs) ||
            (isServerChannel && !settings.store.affectServers)
        ) {
            return true;
        }

        if (pingedReactionChannels.has(message.channel_id)) {
            return false;
        }

        pingedReactionChannels.add(message.channel_id);
        return true;
    },
});
