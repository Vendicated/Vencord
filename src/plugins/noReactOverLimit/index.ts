/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ReactionEmoji } from "discord-types/general";

interface MessageReaction {
    emoji: ReactionEmoji;
    count: number;
    count_details: {
        burst: number;
        normal: number;
    };
    burst_colors: any[];
    me_burst: boolean;
    burst_me: boolean;
    me: boolean;
    burst_count: number;
}

export default definePlugin({
    name: "NoReactOverLimit",
    description: "Hides the react button when the limit has already been reached",
    authors: [Devs.MrDiamond],

    countReactions(reactions: MessageReaction[]) {
        let count = 0;
        reactions.forEach(reaction => {
            if (reaction.count > 0) count++;
            if (reaction.burst_count > 0) count++;
        });
        return count;
    },

    patches: [
        // reaction group button
        {
            find: ".Messages.ADD_BURST_REACTION",
            replacement: {
                match: /(let\{isShown:(\i)\}=(\i);)(return\(0,)/,
                replace: "$1 if ($self.countReactions(this.props.message.reactions) >= 20) return null; $4"
            }
        },
        // message accessory
        {
            find: ",\"add-reaction\"",
            replacement: {
                match: /(let\{channel:\i,message:(\i),togglePopout:\i,renderEmojiPicker:\i,shouldShow:\i}=\i;)(return\(0,)/,
                replace: "$1 if ($self.countReactions($2.reactions) >= 20) return null; $3"
            }
        },
        // quick react buttons
        {
            find: "id:\"quickreact-\".concat",
            replacement: {
                match: /(function \i\((\i),\i\)\{)(let \i=\(0,)/,
                replace: "$1 if ($self.countReactions($2.reactions) >= 20) return null; $3"
            }
        },
        // add reaction context menu button
        {
            find: "id:\"add-reaction\",",
            replacement: {
                match: /(function \i\((\i),\i\)\{)(let\{reducedMotion:)/,
                replace: "$1 if ($self.countReactions($2.reactions) >= 20) return null; $3"
            }
        }
    ]
});
