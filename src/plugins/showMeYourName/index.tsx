/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, UserStore } from "@webpack/common";
import { GuildMember, User } from "discord-types/general";

const StreamerModeStore = findStoreLazy("StreamerModeStore");
const colorPattern = /^#(?:[\da-f]{3}){1,2}$|^#(?:[\da-f]{4}){1,2}$|(rgb|hsl)a?\((\s*-?\d+%?\s*,){2}(\s*-?\d+%?\s*)\)|(rgb|hsl)a?\((\s*-?\d+%?\s*,){3}\s*(0|(0?\.\d+)|1)\)$/iu;
const roleColorPattern = /^role((?:\+|-)\d{0,4})?$/iu;
const symbolPattern = /^[\p{S}\p{P}]{1,3}$/iu;

function validColor(color: string) {
    const trimmedColor = color.trim();
    if (!trimmedColor) return color.length > 0;

    if (trimmedColor.toLowerCase() === "role") return true;

    if (color.toLowerCase().includes("role")) {
        const percentage = parseInt(roleColorPattern.exec(color)?.[1] || "");
        return !isNaN(percentage) && percentage <= 100 && percentage >= -100;
    }

    const colorTestDiv = document.createElement("div");
    colorTestDiv.style.borderColor = color;

    const isValid = colorTestDiv.style.borderColor !== "" && colorPattern.test(color);
    colorTestDiv.remove();

    return isValid;
}

function resolveColor(user: User | GuildMember, savedColor: string, fallbackColor: string) {
    if (!savedColor.trim()) return { color: fallbackColor };

    if (savedColor.toLowerCase().includes("role")) {
        const percentageText = roleColorPattern.exec(savedColor)?.[1] || "";
        if (percentageText && isNaN(parseInt(percentageText))) return { color: fallbackColor };

        const percentage = percentageText ? 1 + (parseInt(percentageText) / 100) : 1;
        const roleColor = (user as GuildMember)?.colorString || null;
        if (!roleColor) return { color: fallbackColor };

        return { color: roleColor, filter: `brightness(${percentage})` };
    } else {
        return { color: savedColor };
    }
}

function validTemplate(value: string) {
    const items = value.trim().split(/\s+/);
    if (items.length > 3 || !items.length) return false;

    const invalidItems = items.some(item => !/(?:\{(nick|display|user)\})/i.test(item));
    if (invalidItems) return false;

    const affixes = parseAffixes(value);
    if (!affixes.order.length || affixes.order.length !== items.length) return false;

    return ["nick", "display", "user"].every(name => {
        const { prefix, suffix } = affixes[name];
        return prefix.length <= 3 && suffix.length <= 3 && (!prefix || symbolPattern.test(prefix)) && (!suffix || symbolPattern.test(suffix));
    });
}

function parseAffixes(template: string) {
    const affixes = {
        order: [] as string[],
        nick: { included: false, prefix: "", suffix: "" },
        display: { included: false, prefix: "", suffix: "" },
        user: { included: false, prefix: "", suffix: "" }
    };

    const types = ["nick", "display", "user"];

    template.split(/\s+/).forEach(item => {
        types.forEach(type => {
            if (item.includes(`{${type}}`)) {
                const [prefix, , suffix] = item.split(/(?:\{(nick|display|user)\})/i);
                affixes.order.push(type);
                affixes[type] = { included: true, prefix, suffix };
            }
        });
    });

    return affixes;
}

const settings = definePluginSettings({
    replies: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also display extra names in replies.",
    },
    mentions: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also display extra names in mentions.",
        restartNeeded: true
    },
    hideDefaultAtSign: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Hide the default '@' symbol before the name in mentions and replies. Only applied if either feature is enabled.",
    },
    respectStreamerMode: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Truncate usernames in Streamer Mode as Discord does everywhere else.",
    },
    removeDuplicates: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "If any of the names are equivalent, remove them, leaving only the unique names.",
    },
    includedNames: {
        type: OptionType.STRING,
        description: "The order to display usernames, nicknames, and display names. Use the following placeholders: {nick}, {display}, {user}. You can have up to three prefixes and three suffixes per name.",
        default: "{nick} [{display}] (@{user})",
        isValid: validTemplate,
    },
    nicknameColor: {
        type: OptionType.STRING,
        description: "The color to use for the nickname. Leave blank for default. Accepts hex(a), rgb(a), or hsl(a) input. Use \"Role\" to follow the user's top role color. Use \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
        isValid: validColor,
    },
    displayNameColor: {
        type: OptionType.STRING,
        description: "The color to use for the display name. Leave blank for default. Accepts hex(a), rgb(a), or hsl(a) input. Use \"Role\" to follow the user's top role color. Use \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
        isValid: validColor,
    },
    usernameColor: {
        type: OptionType.STRING,
        description: "The color to use for the username. Leave blank for default. Accepts hex(a), rgb(a), or hsl(a) input. Use \"Role\" to follow the user's top role color. Use \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
        isValid: validColor,
    }
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display any permutation of nicknames, display names, and usernames in chat.",
    authors: [Devs.Rini, Devs.TheKodeToad, Devs.Etorix, Devs.sadan],
    patches: [
        {
            find: '?"@":""',
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\)}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
        {
            find: "missing user\"",
            predicate: () => settings.store.mentions,
            replacement: {
                match: /"@"\.concat\(null!=(\i)\?\i:(\i)\)/,
                replace: "$self.renderUsername(arguments[0])"
            }
        },
    ],
    settings,

    renderUsername: ErrorBoundary.wrap((props: any) => {
        const { replies, hideDefaultAtSign, respectStreamerMode, removeDuplicates, includedNames, nicknameColor, displayNameColor, usernameColor } = settings.use();

        const renderType = props.className === "mention" ? "mention" : "message";
        let author: any = null;
        let isRepliedMessage = false;
        let mentionSymbol = "";

        if (renderType === "mention") {
            const channel = ChannelStore.getChannel(props.channelId) || {};
            const usr = UserStore.getUser(props.userId) || {};
            const mem = GuildMemberStore.getMember(channel.guild_id, props.userId) || {};
            author = usr && mem ? { ...usr, ...mem } : usr || mem || null;
            isRepliedMessage = false;
            mentionSymbol = hideDefaultAtSign ? "" : "@";
        } else if (renderType === "message") {
            // props.message.author only has a globalName attribute.
            // props.author only has a nick attribute, but it is overwritten by the globalName if no nickname is set.
            // getUser only has a globalName attribute.
            // getMember only has a nick attribute, and it is null if no nickname is set.
            // Therefore just using the author props is not enough for an accurate result and we instead need to combine the results of getUser and getMember.
            const channel = ChannelStore.getChannel(props.message.channel_id) || {};
            const athr = props.userOverride ? props.userOverride : props.message.author;
            const usr = UserStore.getUser(athr.id) || {};
            const mem = GuildMemberStore.getMember(channel.guild_id, athr.id) || {};
            author = usr && mem ? { ...usr, ...mem } : usr || mem || null;
            isRepliedMessage = props.isRepliedMessage;
            mentionSymbol = hideDefaultAtSign ? "" : props.withMentionPrefix ? "@" : "";
        }

        if (!author) {
            return <>{mentionSymbol}Unknown</>;
        }

        const username = StreamerModeStore.enabled && respectStreamerMode ? author.username[0] + "..." : author.username;
        const display = StreamerModeStore.enabled && respectStreamerMode && author.globalName?.toLowerCase() === author.username.toLowerCase() ? author.globalName[0] + "..." : author.globalName || "";
        const nick = StreamerModeStore.enabled && respectStreamerMode && author.nick?.toLowerCase() === author.username.toLowerCase() ? author.nick[0] + "..." : author.nick || "";

        try {
            if (isRepliedMessage && !replies) {
                return <>{mentionSymbol}{nick || display || username}</>;
            }

            const textMutedValue = getComputedStyle(document.documentElement)?.getPropertyValue("--text-muted")?.trim() || "#72767d";
            const affixes = parseAffixes(includedNames);
            const resolvedUsernameColor = resolveColor(author, usernameColor.trim(), textMutedValue);
            const resolvedNicknameColor = resolveColor(author, nicknameColor.trim(), textMutedValue);
            const resolvedDisplayNameColor = resolveColor(author, displayNameColor.trim(), textMutedValue);
            const affixColor = { color: getComputedStyle(document.documentElement)?.getPropertyValue("--text-muted")?.trim() || "#72767d" };

            const values = {
                "user": { "value": username, "prefix": affixes.user.prefix, "suffix": affixes.user.suffix, "color": resolvedUsernameColor },
                "display": { "value": display, "prefix": affixes.display.prefix, "suffix": affixes.display.suffix, "color": resolvedDisplayNameColor },
                "nick": { "value": nick, "prefix": affixes.nick.prefix, "suffix": affixes.nick.suffix, "color": resolvedNicknameColor }
            };

            let { order } = affixes;
            order.includes("nick") && !values.nick.value && !order.includes("display") && values.display.value ? order[order.indexOf("nick")] = "display" : null;
            order.includes("display") && !values.display.value && !order.includes("user") && values.user.value ? order[order.indexOf("display")] = "user" : null;
            order = order.filter((name: string) => values[name].value);

            const first = order.shift() || "user";
            let second = order.shift() || null;
            let third = order.shift() || null;

            if (removeDuplicates) {
                // If third is the same as second, remove it, unless third is the username, then prioritize it.
                second && third && values[third].value.toLowerCase() === values[second].value.toLowerCase() ? third === "user" ? second = null : third = null : null;
                // If second is the same as first, remove it.
                second && values[second].value.toLowerCase() === values[first].value.toLowerCase() ? second = null : null;
                // If third is the same as first, remove it.
                third && values[third].value.toLowerCase() === values[first].value.toLowerCase() ? third = null : null;
            }

            return (
                <>
                    {mentionSymbol && <span>{mentionSymbol}</span>}
                    {(
                        <span>
                            <span>{values[first].value}</span>
                        </span>
                    )}
                    {second && (
                        <span>
                            <span>&nbsp;</span>
                            <span style={affixColor}>
                                {values[second].prefix}</span>
                            <span style={values[second].color}>
                                {values[second].value}</span>
                            <span style={affixColor}>
                                {values[second].suffix}</span>
                        </span>
                    )}
                    {third && (
                        <span>
                            <span>&nbsp;</span>
                            <span style={affixColor}>
                                {values[third].prefix}</span>
                            <span style={values[third].color}>
                                {values[third].value}</span>
                            <span style={affixColor}>
                                {values[third].suffix}</span>
                        </span>
                    )}
                </>
            );
        } catch (e) {
            console.error(e);
            return <>{mentionSymbol}{StreamerModeStore.enabled && respectStreamerMode ? ((nick || display || username)[0] + "...") : (nick || display || username)}</>;
        }
    }, { noop: true }),
});
