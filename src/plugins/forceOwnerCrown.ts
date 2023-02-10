/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
