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
import { Devs } from "@utils/constants";
import { hasGuildFeature } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { GuildMember, Role } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, GuildRoleStore, GuildStore } from "@webpack/common";

const useMessageAuthor = findByCodeLazy('"Result cannot be null because the message is not null"');

function getGradientColors(guildId: string, colorStrings: GuildMember["colorStrings"]) {
    const guild = GuildStore.getGuild(guildId);
    if (!guild || !hasGuildFeature(guild, "ENHANCED_ROLE_COLORS") || !colorStrings?.secondaryColor) return null;

    return colorStrings;
}

function makeColorStyle(guildId: string, { colorString, colorStrings }: Pick<GuildMember | Role, "colorString" | "colorStrings">): React.CSSProperties | undefined {
    const gradient = getGradientColors(guildId, colorStrings);
    if (!gradient) return colorString ? { color: colorString } : undefined;

    const { primaryColor, secondaryColor, tertiaryColor } = gradient;
    const colors = [primaryColor, secondaryColor, tertiaryColor, primaryColor].filter(Boolean).join(",");

    return {
        color: primaryColor,
        background: `linear-gradient(to right,${colors})`,
        backgroundClip: "text",
        backgroundSize: "100px auto",
        WebkitTextFillColor: "transparent"
    };
}

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
    }
});

const logger = new Logger("RoleColorEverywhere");

export default definePlugin({
    name: "RoleColorEverywhere",
    authors: [Devs.KingFish, Devs.lewisakura, Devs.AutumnVN, Devs.Kyuuhachi, Devs.jamesbt365],
    description: "Adds the top role color anywhere possible",
    tags: ["Roles", "Appearance"],
    settings,

    patches: [
        // Chat Mentions
        {
            find: ".USER_MENTION)",
            replacement: [
                {
                    match: /(?<=user:(\i),guildId:([^,]+?),.{0,100}?children:\i=>\i)\((\i)\)/,
                    replace: "({...$3,color:$self.getColorInt($1?.id,$2),roleColors:$self.getRoleColors($1?.id,$2)})",
                }
            ],
            predicate: () => settings.store.chatMentions
        },
        // Slate
        {
            // Same find as FullUserInChatbox
            find: '"text":"locked"',
            replacement: [
                {
                    match: /(?<=let\{id:(\i),guildId:\i,channelId:(\i)\}.{0,300}?popoutProps:)\i(?=\})/,
                    replace: "{...$&,color:$self.getColorInt($1,$2),roleColors:$self.getRoleColors($1,$2)}"
                }
            ],
            predicate: () => settings.store.chatMentions
        },
        // Member List Role Headers (in threads)
        {
            find: 'tutorialId:"whos-online',
            replacement: [
                {
                    match: /(?<=#{intl::CHANNEL_MEMBERS_A11Y_LABEL}.{0,400}?)children:(?=.{0,20}?(?:—|\\u2014) ",\i\])/,
                    replace: "style:$self.getRoleStyle(arguments[0]),$&"
                },
            ],
            predicate: () => settings.store.memberList
        },
        // Member List Role Headers
        {
            find: "?null:new Intl.NumberFormat",
            replacement: [
                {
                    match: /(?<=#{intl::CHANNEL_MEMBERS_A11Y_LABEL},\{title:\i,count:\i\}\)\}\),\(0,\i\.jsxs\)\("div",\{)/,
                    replace: "style:$self.getRoleStyle(arguments[0]),"
                },
            ],
            predicate: () => settings.store.memberList
        },
        // Voice Users
        {
            find: "#{intl::GUEST_NAME_SUFFIX})]",
            replacement: [
                {
                    match: /#{intl::GUEST_NAME_SUFFIX}.{0,50}?""\](?<=guildId:(\i),.+?user:(\i).+?)/,
                    replace: "$&,style:$self.getColorStyle($2.id,$1),"
                }
            ],
            predicate: () => settings.store.voiceUsers
        },
        // Reaction List
        {
            find: "MessageReactions.render:",
            replacement: {
                match: /tag:"strong",variant:"body-md\/medium"(?<=onContextMenu:.{0,15}\((\i),(\i),\i\).+?)/,
                replace: "$&,style:$self.getColorStyle($2?.id,$1?.channel?.id)"
            },
            predicate: () => settings.store.reactorsList,
        },
        // Poll Results
        {
            find: ",reactionVoteCounts",
            replacement: {
                match: /\.SIZE_32.+?variant:"body-md\/normal",className:\i\.\i,(?="aria-label":)/,
                replace: "$&style:$self.getColorStyle(arguments[0]?.user?.id,arguments[0]?.channel?.id),"
            },
            predicate: () => settings.store.pollResults
        },
        // Messages
        {
            find: ".SEND_FAILED,",
            replacement: {
                match: /(?<=\]:(\i)\.isUnsupported.{0,50}?,)(?=children:\[)/,
                replace: "style:$self.useMessageColorsStyle($1),"
            },
            predicate: () => settings.store.colorChatMessages
        }
    ],

    getMember(userId: string, channelOrGuildId: string) {
        try {
            const guildId = ChannelStore.getChannel(channelOrGuildId)?.guild_id ?? GuildStore.getGuild(channelOrGuildId)?.id;
            if (guildId == null) return null;

            const member = GuildMemberStore.getMember(guildId, userId);
            return member && { guildId, member };
        } catch (e) {
            logger.error("Failed to get member", e);
        }

        return null;
    },

    getColorInt(userId: string, channelOrGuildId: string) {
        try {
            const colorString = this.getMember(userId, channelOrGuildId)?.member.colorString;
            return colorString && parseInt(colorString.slice(1), 16);
        } catch (e) {
            logger.error(e);
        }
    },

    getRoleColors(userId: string, channelOrGuildId: string) {
        try {
            const data = this.getMember(userId, channelOrGuildId);
            return data && getGradientColors(data.guildId, data.member.colorStrings);
        } catch (e) {
            logger.error(e);
        }
    },

    getColorStyle(userId: string, channelOrGuildId: string) {
        try {
            const data = this.getMember(userId, channelOrGuildId);
            return data && makeColorStyle(data.guildId, data.member);
        } catch (e) {
            logger.error(e);
        }
    },

    useMessageColorsStyle(message: any) {
        try {
            const { messageSaturation } = settings.use(["messageSaturation"]);
            const author = useMessageAuthor(message);

            // Do not apply role color if the send fails, otherwise it becomes indistinguishable
            if (message.state === "SEND_FAILED") return;

            if (author.colorString != null && messageSaturation !== 0) {
                const value = `color-mix(in oklab, ${author.colorString} ${messageSaturation}%, var({DEFAULT}))`;

                return {
                    color: value.replace("{DEFAULT}", "--text-default"),
                    "--text-strong": value.replace("{DEFAULT}", "--text-strong"),
                    "--text-muted": value.replace("{DEFAULT}", "--text-muted")
                };
            }
        } catch (e) {
            logger.error("Failed to get message color", e);
        }

        return null;
    },

    getRoleStyle(props: any) {
        try {
            const role = GuildRoleStore.getRole(props?.guildId, props?.id);
            return role && makeColorStyle(props.guildId, role);
        } catch (e) {
            logger.error("Failed to get role style", e);
        }
    }
});
