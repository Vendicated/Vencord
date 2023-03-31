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
        description: "Show role colors in chat mentions (including in the message box)",
        restartNeeded: true
    },
    memberList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in member list role headers",
        restartNeeded: true
    },
    voiceUsers: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the voice chat user list",
        restartNeeded: true
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
                    match: /user:(\i),channel:(\i).{0,300}?"@"\.concat\(.+?\)/,
                    replace: "$&,color:$self.getUserColor($1.id,{channelId:$2?.id})"
                }
            ],
            predicate: () => settings.store.chatMentions,
        },
        // Slate
        {
            // taken from CommandsAPI
            find: ".source,children",
            replacement: [
                {
                    match: /function \i\((\i)\).{5,20}id.{5,20}guildId.{5,10}channelId.{100,150}hidePersonalInformation.{5,50}jsx.{5,20},{/,
                    replace: "$&color:$self.getUserColor($1.id,{guildId:$1?.guildId}),"
                }
            ],
            predicate: () => settings.store.chatMentions,
        },
        // Member List Role Names
        {
            find: ".memberGroupsPlaceholder",
            replacement: [
                {
                    match: /(memo\(\(function\((\i)\).{300,500}CHANNEL_MEMBERS_A11Y_LABEL.{100,200}roleIcon.{5,20}null,).," \u2014 ",.\]/,
                    replace: "$1$self.roleGroupColor($2)]"
                },
            ],
            predicate: () => settings.store.memberList,
        },
        // Voice chat users
        {
            find: "renderPrioritySpeaker",
            replacement: [
                {
                    match: /renderName=function\(\).{50,75}speaking.{50,100}jsx.{5,10}{/,
                    replace: "$&...$self.getVoiceProps(this.props),"
                }
            ],
            predicate: () => settings.store.voiceUsers,
        }
    ],
    settings,

    getColor(userId: string, { channelId, guildId }: { channelId?: string; guildId?: string; }) {
        if (!(guildId ??= ChannelStore.getChannel(channelId!)?.guild_id)) return null;
        return GuildMemberStore.getMember(guildId, userId)?.colorString ?? null;
    },
    getUserColor(userId: string, ids: { channelId?: string; guildId?: string; }) {
        const colorString = this.getColor(userId, ids);
        return colorString && parseInt(colorString.slice(1), 16);
    },
    roleGroupColor({ id, count, title, guildId }: { id: string; count: number; title: string; guildId: string; }) {
        const guild = GuildStore.getGuild(guildId);
        const role = guild?.roles[id];

        return <span style={{
            color: role?.colorString,
            fontWeight: "unset",
            letterSpacing: ".05em"
        }}>{title} &mdash; {count}</span>;
    },
    getVoiceProps({ user: { id: userId }, guildId }: { user: { id: string; }; guildId: string; }) {
        return {
            style: {
                color: this.getColor(userId, { guildId })
            }
        };
    }
});
