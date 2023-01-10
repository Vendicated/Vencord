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
import { GuildMemberStore } from "@webpack/common";

export default definePlugin({
    name: "@someone",
    authors: [Devs.cloudburst],
    description: "Adds /@someone command, which pings a random person.",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "@someone",
        description: "@someone randomly on the server.",

        execute(_, ctx) {
            const members = ctx.channel.guild_id ? GuildMemberStore.getMemberIds(ctx.channel.guild_id) : ctx.channel.recipients;
            const member = members[Math.floor(Math.random() * members.length)];
            if (!member) return;
            return {
                content: `<@${member}>`
            };
        },
    }]
});
