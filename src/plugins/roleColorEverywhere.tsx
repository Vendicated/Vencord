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

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildMemberStore, GuildStore } from "@webpack/common";

const settings = definePluginSettings({
    chatMentions: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in chat mentions"
    },
    memberList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in member list role headers"
    }
});

export default definePlugin({
    name: "RoleColorEverywhere",
    authors: [Devs.KingFish, Devs.lewisakura],
    description: "Adds the top role color anywhere possible",
    patches: [
        // Chat Mentions
        {
            find: 'className:"mention"',
            replacement: [
                {
                    match: /user:(\i),channelId:(\i).{0,300}?"@"\.concat\(.+?\)/,
                    replace: "$&,color:$self.getUserColor($1, $2)"
                }
            ],
            predicate: () => settings.store.chatMentions,
        },
        // Member List Role Names
        {
            find: ".memberGroupsPlaceholder",
            replacement: [
                {
                    match: /(memo\(\(function\((.)\).{0,500}CHANNEL_MEMBERS_A11Y_LABEL.+?roleIcon.{5,20}null,).," \u2014 ",.\]/,
                    replace: "$1$self.roleGroupColor($2)]"
                },
            ],
            predicate: () => settings.store.memberList,
        },
    ],
    settings,

    getColor(userId, channelId) {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) {
            return null;
        }

        const member = GuildMemberStore.getMember(channel.guild_id, userId);
        if (!member) {
            return null;
        }

        return member?.colorString;
    },
    getUserColor({ id: userId }, channelId) {
        const colorString = this.getColor(userId, channelId);
        return colorString && parseInt(colorString.slice(1), 16);
    },
    roleGroupColor({ id, count, title, guildId, ...args }) {
        const guild = GuildStore.getGuild(guildId);
        const role = guild?.roles[id];

        return <span style={{
            color: role?.colorString,
            fontWeight: "unset",
            letterSpacing: ".05em"
        }}>{title} &mdash; {count}</span>;
    }
});
