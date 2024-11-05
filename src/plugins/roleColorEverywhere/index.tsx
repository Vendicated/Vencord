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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, GuildStore } from "@webpack/common";

const useMessageAuthor = findByCodeLazy('"Result cannot be null because the message is not null"');

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
    },
    reactorsList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the reactors list",
        restartNeeded: true
    },
    colorChatMessages: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Color chat messages based on the author's role color",
        restartNeeded: true,
    },
    messageSaturation: {
        type: OptionType.SLIDER,
        description: "Intensity of message coloring.",
        markers: makeRange(0, 100, 10),
        default: 30
    },
});


export default definePlugin({
    name: "RoleColorEverywhere",
    authors: [Devs.KingFish, Devs.lewisakura, Devs.AutumnVN, Devs.Kyuuhachi],
    description: "Adds the top role color anywhere possible",
    patches: [
        // Chat Mentions
        {
            find: ".USER_MENTION)",
            replacement: [
                {
                    match: /onContextMenu:\i,color:\i,\.\.\.\i(?=,children:)(?<=user:(\i),channel:(\i).{0,500}?)/,
                    replace: "$&,color:$self.getUserColor($1?.id,{channelId:$2?.id})"
                }
            ],
            predicate: () => settings.store.chatMentions,
        },
        // Slate
        {
            find: ".userTooltip,children",
            replacement: [
                {
                    match: /let\{id:(\i),guildId:(\i)[^}]*\}.*?\.\i,{(?=children)/,
                    replace: "$&color:$self.getUserColor($1,{guildId:$2}),"
                }
            ],
            predicate: () => settings.store.chatMentions,
        },
        {
            find: 'tutorialId:"whos-online',
            replacement: [
                {
                    match: /null,\i," — ",\i\]/,
                    replace: "null,$self.roleGroupColor(arguments[0])]"
                },
            ],
            predicate: () => settings.store.memberList,
        },
        {
            find: "#{intl::THREAD_BROWSER_PRIVATE}",
            replacement: [
                {
                    match: /children:\[\i," — ",\i\]/,
                    replace: "children:[$self.roleGroupColor(arguments[0])]"
                },
            ],
            predicate: () => settings.store.memberList,
        },
        {
            find: "renderPrioritySpeaker",
            replacement: [
                {
                    match: /renderName\(\){.+?usernameSpeaking\]:.+?(?=children)/,
                    replace: "$&...$self.getVoiceProps(this.props),"
                }
            ],
            predicate: () => settings.store.voiceUsers,
        },
        {
            find: ".reactorDefault",
            replacement: {
                match: /,onContextMenu:e=>.{0,15}\((\i),(\i),(\i)\).{0,250}tag:"strong"/,
                replace: "$&,style:{color:$self.getColor($2?.id,$1)}"
            },
            predicate: () => settings.store.reactorsList,
        },
        {
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                match: /(?<=isUnsupported\]:(\i)\.isUnsupported\}\),)(?=children:\[)/,
                replace: "style:{color:$self.useMessageColor($1)},"
            },
            predicate: () => settings.store.colorChatMessages,
        },
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

    roleGroupColor: ErrorBoundary.wrap(({ id, count, title, guildId, label }: { id: string; count: number; title: string; guildId: string; label: string; }) => {
        const role = GuildStore.getRole(guildId, id);

        return (
            <span style={{
                color: role?.colorString,
                fontWeight: "unset",
                letterSpacing: ".05em"
            }}>
                {title ?? label} &mdash; {count}
            </span>
        );
    }, { noop: true }),

    getVoiceProps({ user: { id: userId }, guildId }: { user: { id: string; }; guildId: string; }) {
        return {
            style: {
                color: this.getColor(userId, { guildId })
            }
        };
    },

    useMessageColor(message: any) {
        try {
            const { messageSaturation } = settings.use(["messageSaturation"]);
            const author = useMessageAuthor(message);
            if (author.colorString !== undefined && messageSaturation !== 0)
                return `color-mix(in oklab, ${author.colorString} ${messageSaturation}%, var(--text-normal))`;
        } catch (e) {
            console.error("[RCE] failed to get message color", e);
        }
        return undefined;
    },
});
