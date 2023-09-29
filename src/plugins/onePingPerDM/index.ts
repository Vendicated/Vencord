/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, ReadStateStore } from "@webpack/common";
import { Message } from "discord-types/general";

const enum ChannelType {
    DM = 1,
    GROUP_DM = 3
}

export default definePlugin({
    name: "OnePingPerDM",
    description: "If unread messages are sent by a user in DMs multiple times, you'll only receive one audio ping. Read the messages to reset the limit",
    authors: [Devs.ProffDea],
    patches: [{
        find: ".getDesktopType()===",
        replacement: [{
            match: /if\((\i\.\i\.getDesktopType\(\)===\i\.\i\.NEVER)\){/,
            replace: "if($1){if(!$self.isPrivateChannelRead(arguments[0]?.message))return;"
        },
        {
            match: /sound:(\i\?\i:void 0,volume:\i,onClick:)/,
            replace: "sound:!$self.isPrivateChannelRead(arguments[0]?.message)?undefined:$1"
        }]
    }],
    isPrivateChannelRead(message: Message) {
        const channelType = ChannelStore.getChannel(message.channel_id)?.type;
        if (channelType !== ChannelType.DM && channelType !== ChannelType.GROUP_DM) {
            return false;
        }
        return ReadStateStore.getOldestUnreadMessageId(message.channel_id) === message.id;
    },
});
