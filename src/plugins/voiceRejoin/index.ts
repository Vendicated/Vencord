/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore } from "@webpack/common";

const ChannelActions = findByPropsLazy("selectVoiceChannel", "selectChannel");

export default definePlugin({
    name: "VoiceRejoin",
    description: "Automatically rejoins the voice channel you were in when you last closed Discord",
    tags: ["Voice", "Utility"],
    authors: [Devs.Osheun],

    patches: [
        {
            find: "getLastSessionVoiceChannelId(){",
            replacement: {
                match: /setLastSessionVoiceChannelId\((\i)\){/,
                replace: "$&if($self.rejoin($1))return;"
            }
        }
    ],

    rejoin(channelId: string | null) {
        try {
            if (!channelId || !ChannelStore.getChannel(channelId)) return false;

            setTimeout(() => ChannelActions.selectVoiceChannel(channelId));
            return true;
        } catch {
            return false;
        }
    }
});
