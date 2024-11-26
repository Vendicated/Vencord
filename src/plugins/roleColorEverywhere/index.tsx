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
import { ChannelStore, GuildMemberStore, GuildStore, useEffect, useState } from "@webpack/common";

import { Color, Contrast } from "./color";


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
    minColorContrast: {
        type: OptionType.STRING,
        description: "the min contrast that colors will be rendered at, `1` to disable",
        default: "1",
    }
}, {
    minColorContrast: {
        isValid(value) {
            if (value === "") return true;
            return !Number.isNaN(parseFloat(value)) || "Input is not a number";
        },
    }
});

export function clamp(min, max, val) {
    return Math.max(min, Math.min(max, val));
}

export function getContrastValue() {
    const num = parseFloat(settings.store.minColorContrast);
    if (Number.isNaN(num)) return 1;
    return clamp(1, 21, num);
}
export function useGetContrastValue() {
    const { minColorContrast } = settings.use(["minColorContrast"]);
    const [contrast, setContrast] = useState(getContrastValue());
    useEffect(() => {
        setContrast(getContrastValue());
    }, [minColorContrast]);
    return contrast;
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

    useMessageColorsStyle(message: any, ref: any | null) {
        try {
            const { messageSaturation } = settings.use(["messageSaturation"]);
            const author = useMessageAuthor(message);
            const contrast = useGetContrastValue();

            if (author.colorString != null && messageSaturation !== 0) {
                if (contrast === 1) {
                    const value = `color-mix(in oklab, ${author.colorString} ${messageSaturation}%, var({DEFAULT}))`;

                    return {
                        color: value.replace("{DEFAULT}", "--text-normal"),
                        "--header-primary": value.replace("{DEFAULT}", "--header-primary"),
                        "--text-muted": value.replace("{DEFAULT}", "--text-muted")
                    };
                }
                if (!ref.current) return;
                const computed = window.getComputedStyle(ref.current);
                const textNormal = computed.getPropertyValue("--text-normal"),
                    headerPrimary = computed.getPropertyValue("--header-primary"),
                    textMuted = computed.getPropertyValue("--text-muted");
                const bgOverlayChat = computed.getPropertyValue("--bg-overlay-chat"),
                    backgroundPrimary = computed.getPropertyValue("--background-primary");
                if (!(bgOverlayChat || backgroundPrimary)) {
                    throw new Error("No background color found");
                }
                const bg = new Contrast(Color.parse(bgOverlayChat || backgroundPrimary));
                return {
                    color: bg.calculateMinContrastColor(Color.mixokl(author.colorString, textNormal, messageSaturation), contrast),
                    "--header-primary": bg.calculateMinContrastColor(Color.mixokl(author.colorString, headerPrimary, messageSaturation), contrast),
                    "--text-muted": bg.calculateMinContrastColor(Color.mixokl(author.colorString, textMuted, messageSaturation), contrast)
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
