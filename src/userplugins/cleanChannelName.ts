/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel } from "discord-types/general";

export default definePlugin({
    name: "CleanChannelName",
    authors: [Devs.AutumnVN],
    description: "remove all emoji and decor shit from channel names",
    patches: [
        {
            find: "loadAllGuildAndPrivateChannelsFromDisk(){",
            replacement: {
                match: /(?<=getChannel\(\i\)\{if\(null!=\i\)return )\i\(\i\)/,
                replace: "$self.cleanChannelName($&)",
            }
        }
    ],

    cleanChannelName(channel?: Channel) {
        if (channel) {
            channel.name = channel.name.normalize("NFKC").replace(/[^\u0020-\u007E]?\p{Extended_Pictographic}[^\u0020-\u007E]?/ug, "").replace(/-?[^\p{Letter}\u0020-\u007E]-?/ug, [2, 4].includes(channel.type) ? " " : "-").replace(/(^-|-$)/g, "");
        }
        return channel;
    }
});
