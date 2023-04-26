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
import { findByProps } from "@webpack";


export default definePlugin({
    name: "PermLurk",
    description: "allows you to perm lurk guilds",
    authors: [Devs.Jup],

    flux: {
        GUILD_JOIN({ guildId }) {
            setTimeout(() => {
                findByProps("getGuildsTree").getGuildsTree().root.children.unshift({ type: "guild", guildId, unavailable: false, children: [] });
                findByProps("getGuildCount").getGuild(guildId).joinedAt = new Date;
                findByProps("lurkingGuildIds").lurkingGuildIds().pop();
                findByProps("joinGuild").transitionToGuildSync(guildId);
            }, 600);

        }
    }
});
