/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { GuildStore } from "@webpack/common";

export default definePlugin({
    name: "ForceOwnerCrown",
    description: "Force the owner crown next to usernames even if the server is large.",
    authors: [Devs.D3SOX, Devs.Nickyux],
    patches: [
        {
            // This is the logic where it decides whether to render the owner crown or not
            find: ".renderOwner=",
            replacement: {
                match: /isOwner;return null!=(\w+)?&&/g,
                replace: "isOwner;if($self.isGuildOwner(this.props)){$1=true;}return null!=$1&&"
            }
        },
    ],
    isGuildOwner(props) {
        // Check if channel is a Group DM, if so return false
        if (props?.channel?.type === 3) {
            return false;
        }

        // guild id is in props twice, fallback if the first is undefined
        const guildId = props?.guildId ?? props?.channel?.guild_id;
        const userId = props?.user?.id;

        if (guildId && userId) {
            const guild = GuildStore.getGuild(guildId);
            if (guild) {
                return guild.ownerId === userId;
            }
            console.error("[ForceOwnerCrown] failed to get guild", { guildId, guild, props });
        } else {
            console.error("[ForceOwnerCrown] no guildId or userId", { guildId, userId, props });
        }
        return false;
    },
});
