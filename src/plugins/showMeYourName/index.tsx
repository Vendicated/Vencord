/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { GuildMember, User } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, UserStore } from "@webpack/common";

const wrapEmojis = findByCodeLazy(/"span",\{className:\i\.emoji,children:/);
const StreamerModeStore = findStoreLazy("StreamerModeStore");
const colorPattern = /^#(?:[\da-f]{3}){1,2}$|^#(?:[\da-f]{4}){1,2}$|(rgb|hsl)a?\((\s*-?\d+%?\s*,){2}(\s*-?\d+%?\s*)\)|(rgb|hsl)a?\((\s*-?\d+%?\s*,){3}\s*(0|(0?\.\d+)|1)\)$/iu;
const roleColorPattern = /^role((?:\+|-)\d{0,4})?$/iu;
const symbolPattern = /^[\p{S}\p{P}]{1,3}$/iu;

function adjustHex(color: string, percent: number): string {
    let hex = color.replace("#", "");

    if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
    }

    const num = parseInt(hex, 16);
    let r = (num >> 16) & 0xFF;
    let g = (num >> 8) & 0xFF;
    let b = num & 0xFF;

    r = Math.max(0, Math.min(255, r + Math.round(r * (percent / 100))));
    g = Math.max(0, Math.min(255, g + Math.round(g * (percent / 100))));
    b = Math.max(0, Math.min(255, b + Math.round(b * (percent / 100))));

    const newColor = ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");

    if (newColor === "ffffff" || newColor === "000000") {
        return color;
    }

    return `#${newColor}`;
}

function validColor(color: string) {
    const trimmedColor = color.trim();

    if (!color) return true;
    if (trimmedColor.length !== color.length) return false;
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
    const fallbackReturn = {
        normal: {
            original: {
                color: fallbackColor,
                "text-decoration-color": fallbackColor,
            },
            adjusted: {
                color: fallbackColor,
                "text-decoration-color": fallbackColor,
            }
        },
        gradient: null
    };

    if (!savedColor.trim()) { return fallbackReturn; }

    let gradient: any = null;
    let primaryColor: any = savedColor;
    let secondaryColor: any = savedColor;
    let tertiaryColor: any = savedColor;
    let primaryAdjusted: any = savedColor;
    let secondaryAdjusted: any = savedColor;
    let tertiaryAdjusted: any = savedColor;

    if (savedColor.toLowerCase().includes("role")) {
        const percentage = roleColorPattern.exec(savedColor)?.[1] || "";
        if (percentage && isNaN(parseInt(percentage))) return { color: fallbackColor };

        const colorStrings = (user as any)?.colorStrings || {};
        primaryColor = colorStrings.primaryColor || null;
        secondaryColor = colorStrings.secondaryColor || null;
        tertiaryColor = colorStrings.tertiaryColor || null;
        primaryAdjusted = primaryColor;
        secondaryAdjusted = secondaryColor;
        tertiaryAdjusted = tertiaryColor;

        if (!primaryColor) { return fallbackReturn; }

        if (primaryColor && percentage) {
            primaryAdjusted = adjustHex(primaryColor, parseInt(percentage));
        }

        if (secondaryColor && percentage) {
            secondaryAdjusted = adjustHex(secondaryColor, parseInt(percentage));
        }

        if (tertiaryColor && percentage) {
            tertiaryAdjusted = adjustHex(tertiaryColor, parseInt(percentage));
        }

        gradient = !secondaryColor
            ? null
            : tertiaryColor
                ? "linear-gradient(to right,var(--custom-gradient-color-1),var(--custom-gradient-color-2),var(--custom-gradient-color-1))"
                : "linear-gradient(to right,var(--custom-gradient-color-1),var(--custom-gradient-color-2),var(--custom-gradient-color-3),var(--custom-gradient-color-1))";
    }

    const baseNormalStyle = {
        "font-weight": "initial",
        "isolation": "isolate",
    };

    const baseGradientStaticStyle = {
        "font-weight": "initial",
        "background": gradient,
        "background-clip": "text",
        "-webkit-text-fill-color": "transparent",
        "-webkit-background-clip": "text",
        "isolation": "isolate",
    };

    return {
        normal: {
            original: { ...baseNormalStyle, "color": primaryColor, "text-decoration-color": primaryColor, "-webkit-text-fill-color": primaryColor },
            adjusted: { ...baseNormalStyle, "color": primaryAdjusted, "text-decoration-color": primaryAdjusted, "-webkit-text-fill-color": primaryAdjusted },
        },
        gradient: gradient ? {
            animated: {
                original: { "color": primaryColor, "text-decoration-color": primaryColor },
                adjusted: { "color": primaryAdjusted, "text-decoration-color": primaryAdjusted },
            },
            static: {
                original: {
                    ...baseGradientStaticStyle,
                    "color": primaryColor,
                    "text-decoration-color": primaryColor,
                    "--custom-gradient-color-1": primaryColor,
                    "--custom-gradient-color-2": secondaryColor || primaryColor,
                    "--custom-gradient-color-3": tertiaryColor || primaryColor
                },
                adjusted: {
                    ...baseGradientStaticStyle,
                    "color": primaryAdjusted,
                    "text-decoration-color": primaryAdjusted,
                    "--custom-gradient-color-1": primaryAdjusted,
                    "--custom-gradient-color-2": secondaryAdjusted || primaryAdjusted,
                    "--custom-gradient-color-3": tertiaryAdjusted || primaryAdjusted
                },
            }
        } : null,
    };
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
    },
    discriminators: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Append discriminators to usernames for bots. Discriminators were deprecated for users, but are still used for bots. By default, a bot's username is equivalent to a user's global name, therefore multiple bots can have the same username. Appending discriminators makes them unique again.",
    },
    hideDefaultAtSign: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Hide the default \"@\" symbol before the name in mentions and replies. Only applied if either feature is enabled.",
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
    ignoreGradients: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "For the second and third names, if the color is set to \"Role+-\" and the role has a gradient, flatten it to the primary color.",
    },
    animateGradients: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "For the second and third names, if the color is set to \"Role+-\" and the role has a gradient, animate it. This is disabled by \"Ignore Gradients\" and will cause the +- percentage to role colors to be ignored as well.",
    },
    includedNames: {
        type: OptionType.STRING,
        description: "The order to display usernames, nicknames, and display names. Use the following placeholders: {nick}, {display}, {user}. You can have up to three prefixes and three suffixes per name.",
        default: "{nick} [{display}] (@{user})",
        isValid: validTemplate,
    },
    nicknameColor: {
        type: OptionType.STRING,
        description: "The color to use for the nickname if it's not the first displayed. Leave blank for default. Accepts hex(a), rgb(a), or hsl(a) input. Use \"Role\" to follow the user's top role color. Use \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
        isValid: validColor,
    },
    displayNameColor: {
        type: OptionType.STRING,
        description: "The color to use for the display name if it's not the first displayed. Leave blank for default. Accepts hex(a), rgb(a), or hsl(a) input. Use \"Role\" to follow the user's top role color. Use \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
        isValid: validColor,
    },
    usernameColor: {
        type: OptionType.STRING,
        description: "The color to use for the username if it's not the first displayed. Leave blank for default. Accepts hex(a), rgb(a), or hsl(a) input. Use \"Role\" to follow the user's top role color. Use \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
        isValid: validColor,
    }
});

export function renderedUsername(props: any) {
    const { replies, mentions, discriminators, hideDefaultAtSign, respectStreamerMode, removeDuplicates, includedNames, nicknameColor, displayNameColor, usernameColor } = settings.use();

    const textMutedValue = getComputedStyle(document.documentElement)?.getPropertyValue("--text-muted")?.trim() || "#72767d";
    const renderType = props.className === "mention" ? "mention" : "message";
    const isMention = renderType === "mention";
    const isMessage = renderType === "message";
    let author: any = null;
    let isRepliedMessage = false;
    let mentionSymbol = "";
    let discriminator = null;
    let topRoleStyle: any = null;

    if (isMention) {
        const channel = ChannelStore.getChannel(props.channelId) || {};
        const usr = UserStore.getUser(props.userId) || {};
        const mem = GuildMemberStore.getMember(channel.guild_id, props.userId) || {};
        author = usr && mem ? { ...usr, ...mem } : usr || mem || null;
        isRepliedMessage = false;
        mentionSymbol = hideDefaultAtSign && mentions ? "" : "@";
        topRoleStyle = resolveColor(author, "Role", "");
    } else if (isMessage) {
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
        // Treat interactions as replies. Compare user override against message author to not mislabel the bot's name as a name-in-reply.
        isRepliedMessage = props.isRepliedMessage || !!(!!props.userOverride && !!props.message.interaction && props.message.author.id !== props.userOverride.id);
        mentionSymbol = hideDefaultAtSign && (!isRepliedMessage || replies) ? "" : props.withMentionPrefix ? "@" : "";
    }

    author?.bot && discriminators && !isNaN(author.discriminator) ? discriminator = author.discriminator : null;

    if (discriminator) {
        author.globalName = author.username;
        author.username = `${author.username}#${discriminator}`;
    }

    const username = StreamerModeStore.enabled && respectStreamerMode ? author?.username[0] + "..." : author?.username || "";
    const display = StreamerModeStore.enabled && respectStreamerMode && author?.globalName?.toLowerCase() === author?.username.toLowerCase() ? author?.globalName[0] + "..." : author?.globalName || "";
    const nick = StreamerModeStore.enabled && respectStreamerMode && author?.nick?.toLowerCase() === author?.username.toLowerCase() ? author?.nick[0] + "..." : author?.nick || "";

    const affixes = parseAffixes(includedNames);
    const resolvedUsernameColor = author ? resolveColor(author, usernameColor.trim(), "") : null;
    const resolvedNicknameColor = author ? resolveColor(author, nicknameColor.trim(), "") : null;
    const resolvedDisplayNameColor = author ? resolveColor(author, displayNameColor.trim(), "") : null;
    const affixColor = { color: textMutedValue, "-webkit-text-fill-color": textMutedValue };

    const values = {
        "user": { "value": username, "prefix": affixes.user.prefix, "suffix": affixes.user.suffix, "style": resolvedUsernameColor },
        "display": { "value": display, "prefix": affixes.display.prefix, "suffix": affixes.display.suffix, "style": resolvedDisplayNameColor },
        "nick": { "value": nick, "prefix": affixes.nick.prefix, "suffix": affixes.nick.suffix, "style": resolvedNicknameColor }
    };

    let { order } = affixes;
    order.includes("nick") && !values.nick.value && !order.includes("display") && values.display.value ? order[order.indexOf("nick")] = "display" : null;
    order.includes("display") && !values.display.value && !order.includes("user") && values.user.value ? order[order.indexOf("display")] = "user" : null;
    order = order.filter((name: string) => values[name].value);

    const first = order.shift() || "user";
    let second = order.shift() || null;
    let third = order.shift() || null;

    const firstValue = wrapEmojis(values[first].value);
    const secondValue = wrapEmojis(second ? values[second].value : "");
    const thirdValue = wrapEmojis(third ? values[third].value : "");

    if (!author || !username) {
        return <>{mentionSymbol}Unknown</>;
    } else if (isRepliedMessage && !replies) {
        return <>{mentionSymbol}{nick || display || username}</>;
    } else if (isMention && !mentions) {
        return <>{mentionSymbol}{nick || display || username}</>;
    }

    if (removeDuplicates) {
        // If third is the same as second, remove it, unless third is the username, then prioritize it.
        second && third && values[third].value.toLowerCase() === values[second].value.toLowerCase() ? third === "user" ? second = null : third = null : null;
        // If second is the same as first, remove it.
        second && values[second].value.toLowerCase() === values[first].value.toLowerCase() ? second = null : null;
        // If third is the same as first, remove it.
        third && values[third].value.toLowerCase() === values[first].value.toLowerCase() ? third = null : null;
    }

    return (
        <span>
            {mentionSymbol && <span>{mentionSymbol}</span>}
            {/* If it's a message render, let Discord handle the default coloring.
                If it's a mention, patch in the top role color.*/}
            {(
                <span>
                    <span style={
                        !topRoleStyle
                            ? undefined
                            : !topRoleStyle.gradient
                                ? topRoleStyle.normal.original
                                : isMention
                                    ? topRoleStyle.gradient.static.original
                                    : topRoleStyle.gradient.animated.original
                    }>
                        {firstValue}
                    </span>
                </span>
            )}
            {second && (
                <span>
                    <span>&nbsp;</span>
                    <span style={affixColor}>
                        {values[second].prefix}</span>
                    <span style={
                        settings.store.ignoreGradients
                            ? values[second].style.normal.adjusted
                            : settings.store.animateGradients && values[second].style.gradient
                                ? values[second].style.gradient.animated.original
                                : values[second].style.gradient
                                    ? values[second].style.gradient.static.adjusted
                                    : values[second].style.normal.adjusted
                    }>
                        {secondValue}</span>
                    <span style={affixColor}>
                        {values[second].suffix}</span>
                </span>
            )}
            {third && (
                <span>
                    <span>&nbsp;</span>
                    <span style={affixColor}>
                        {values[third].prefix}</span>
                    <span style={
                        settings.store.ignoreGradients
                            ? values[third].style.normal.adjusted
                            : settings.store.animateGradients && values[third].style.gradient
                                ? values[third].style.gradient.animated.original
                                : values[third].style.gradient
                                    ? values[third].style.gradient.static.adjusted
                                    : values[third].style.normal.adjusted
                    }>
                        {thirdValue}</span>
                    <span style={affixColor}>
                        {values[third].suffix}</span>
                </span>
            )}
        </span>
    );
}

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display any permutation of nicknames, display names, and usernames in chat.",
    authors: [Devs.Rini, Devs.TheKodeToad, Devs.Etorix, Devs.sadan],

    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /(onContextMenu:\i,children:)[^}]+}[^}]+/,
                replace: "$1$self.renderUsername(arguments[0])"
            }
        },
        {
            find: ".USER_MENTION)",
            replacement: {
                match: /"@"\.concat\(null!=\i\?\i:\i\)/,
                replace: "$self.renderUsername(arguments[0])"
            }
        }
    ],
    settings,

    renderUsername: ErrorBoundary.wrap(renderedUsername, { noop: true }),
});
