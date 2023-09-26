/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, ReadStateStore } from "@webpack/common";
import { Message } from "discord-types/general";

enum ChannelType {
    DM = 1,
    GROUP_DM = 3
}

export default definePlugin({
    name: "OnePingPerUser",
    description: "Limits the ping audio notification from playing more than once per user until messages are marked as read to prevent audio spam and hearing multiple notifications as a cue that more than one user may have messaged you",
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
        const channelType = ChannelStore.getChannel(message.channel_id).type;
        if (channelType !== ChannelType.DM && channelType !== ChannelType.GROUP_DM) {
            return undefined;
        }
        return ReadStateStore.getOldestUnreadMessageId(message.channel_id) === message.id;
    },
});
