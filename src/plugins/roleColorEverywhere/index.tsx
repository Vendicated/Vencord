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
import { Logger } from "@utils/Logger";
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
    pollResults: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the poll results",
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

// https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-procedure
/**
    * @param color1 -- hex code, with #
    * @param color2 -- hex code, with #
    */
function calculateContrast(color1: string, color2: string) {
    return (lumin(color1) + .05) / (lumin(color2) + .05);
}

/**
    * @param color -- hex code with #
    */
function lumin(color: string) {
    const c: [number, number, number] = [0, 0, 0];
    if(color.length === 4) {
        c[0] = parseInt(color[1], 16);
        c[1] = parseInt(color[2], 16);
        c[2] = parseInt(color[3], 16);
    } else if (color.length === 7) {
        c[0] = parseInt(color.substring(1, 3), 16);
        c[1] = parseInt(color.substring(3, 5), 16);
        c[2] = parseInt(color.substring(5, 7), 16);
    } else {
        throw new Error("invalid color");
    }
    c.map(x => x / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055)/1.055)**2.4);

    return (.2126 * c[0]) + (.7152 * c[1]) + (.0722 * c[2]);
}

export default definePlugin({
    name: "RoleColorEverywhere",
    authors: [Devs.KingFish, Devs.lewisakura, Devs.AutumnVN, Devs.Kyuuhachi, Devs.jamesbt365],
    description: "Adds the top role color anywhere possible",
    settings,

    patches: [
        // Chat Mentions
        {
            find: ".USER_MENTION)",
            replacement: [
                {
                    match: /onContextMenu:\i,color:\i,\.\.\.\i(?=,children:)(?<=user:(\i),channel:(\i).{0,500}?)/,
                    replace: "$&,color:$self.getColorInt($1?.id,$2?.id)"
                }
            ],
            predicate: () => settings.store.chatMentions
        },
        // Slate
        {
            find: ".userTooltip,children",
            replacement: [
                {
                    match: /let\{id:(\i),guildId:\i,channelId:(\i)[^}]*\}.*?\.\i,{(?=children)/,
                    replace: "$&color:$self.getColorInt($1,$2),"
                }
            ],
            predicate: () => settings.store.chatMentions
        },
        // Member List Role Headers
        {
            find: 'tutorialId:"whos-online',
            replacement: [
                {
                    match: /null,\i," — ",\i\]/,
                    replace: "null,$self.RoleGroupColor(arguments[0])]"
                },
            ],
            predicate: () => settings.store.memberList
        },
        {
            find: "#{intl::THREAD_BROWSER_PRIVATE}",
            replacement: [
                {
                    match: /children:\[\i," — ",\i\]/,
                    replace: "children:[$self.RoleGroupColor(arguments[0])]"
                },
            ],
            predicate: () => settings.store.memberList
        },
        // Voice Users
        {
            find: "renderPrioritySpeaker(){",
            replacement: [
                {
                    match: /renderName\(\){.+?usernameSpeaking\]:.+?(?=children)/,
                    replace: "$&style:$self.getColorStyle(this?.props?.user?.id,this?.props?.guildId),"
                }
            ],
            predicate: () => settings.store.voiceUsers
        },
        // Reaction List
        {
            find: ".reactorDefault",
            replacement: {
                match: /,onContextMenu:\i=>.{0,15}\((\i),(\i),(\i)\).{0,250}tag:"strong"/,
                replace: "$&,style:$self.getColorStyle($2?.id,$1?.channel?.id)"
            },
            predicate: () => settings.store.reactorsList,
        },
        // Poll Results
        {
            find: ",reactionVoteCounts",
            replacement: {
                match: /\.nickname,(?=children:)/,
                replace: "$&style:$self.getColorStyle(arguments[0]?.user?.id,arguments[0]?.channel?.id),"
            },
            predicate: () => settings.store.pollResults
        },
        // Messages
        {
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                match: /(?<=isUnsupported\]:(\i)\.isUnsupported\}\),)(?=children:\[)/,
                replace: "style:$self.useMessageColorsStyle($1, vc_ref),"
            },
            predicate: () => settings.store.colorChatMessages
        },
        // HORROR
        {
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                match: /(contentRef:(\i).+?(\i)\.useRef.+?)(?=return)/,
                replace: "$1let vc_ref = $2 ?? $3.useRef(null);"
            }
        },
        {
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                match: /(?<=ref:)\i/,
                replace: "vc_ref"
            }
        }
    ],

    getColorString(userId: string, channelOrGuildId: string) {
        try {
            const guildId = ChannelStore.getChannel(channelOrGuildId)?.guild_id ?? GuildStore.getGuild(channelOrGuildId)?.id;
            if (guildId == null) return null;

            return GuildMemberStore.getMember(guildId, userId)?.colorString ?? null;
        } catch (e) {
            new Logger("RoleColorEverywhere").error("Failed to get color string", e);
        }

        return null;
    },

    getColorInt(userId: string, channelOrGuildId: string) {
        const colorString = this.getColorString(userId, channelOrGuildId);
        return colorString && parseInt(colorString.slice(1), 16);
    },

    getColorStyle(userId: string, channelOrGuildId: string) {
        const colorString = this.getColorString(userId, channelOrGuildId);

        return colorString && {
            color: colorString
        };
    },

    useMessageColorsStyle(message: any, test: any | null) {
        try {
            const { messageSaturation } = settings.use(["messageSaturation"]);
            const author = useMessageAuthor(message);

            if (author.colorString != null && messageSaturation !== 0) {
                console.log(author.colorString);
                const value = `color-mix(in oklab, ${author.colorString} ${messageSaturation}%, var({DEFAULT}))`;

                return {
                    color: value.replace("{DEFAULT}", "--text-normal"),
                    "--header-primary": value.replace("{DEFAULT}", "--header-primary"),
                    "--text-muted": value.replace("{DEFAULT}", "--text-muted")
                };
            }
        } catch (e) {
            new Logger("RoleColorEverywhere").error("Failed to get message color", e);
        }

        return null;
    },

    RoleGroupColor: ErrorBoundary.wrap(({ id, count, title, guildId, label }: { id: string; count: number; title: string; guildId: string; label: string; }) => {
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
    }, { noop: true })
});
