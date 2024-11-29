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
import { ChannelStore, GuildMemberStore } from "@webpack/common";
import { Message, User } from "discord-types/general";

const StreamerModeStore = findStoreLazy("StreamerModeStore");
const colorPattern = /^#(?:[\da-f]{3}){1,2}$|^#(?:[\da-f]{4}){1,2}$|(rgb|hsl)a?\((\s*-?\d+%?\s*,){2}(\s*-?\d+%?\s*)\)|(rgb|hsl)a?\((\s*-?\d+%?\s*,){3}\s*(0|(0?\.\d+)|1)\)$/iu;
const roleColorPattern = /^role((?:\+|-)\d{0,4})?$/iu;

function validColor(color: string) {
    if (!color.trim()) {
        if (color.length > 0) {
            return false;
        }
        return true;
    }

    if (color.trim().toLowerCase() === "role") {
        return true;
    } else if (color.toLowerCase().includes("role")) {
        const percentage = roleColorPattern.exec(color)?.[1] || "";
        if (isNaN(parseInt(percentage))) {
            return false;
        }
        if (parseInt(percentage) > 100 || parseInt(percentage) < -100) {
            return false;
        }
        return true;
    }

    const colorTestDiv = document.createElement("div");
    colorTestDiv.style.borderColor = color;

    const colorIsValid = colorTestDiv.style.borderColor !== "";
    const matchesRegex = colorPattern.test(color);

    colorTestDiv.remove();
    return matchesRegex && colorIsValid;
}

function validSymbols(value: string) {
    return value === "" || (value.length <= 3 && /^[\p{S}\p{P}]{1,3}$/u.test(value));
}

function resolveColor(channelId: string, userId: string, savedColor: string, fallbackColor: string) {
    if (!savedColor.trim()) {
        return { color: fallbackColor };
    }

    if (savedColor.toLowerCase().includes("role")) {
        const percentageText = roleColorPattern.exec(savedColor)?.[1] || "";
        if (percentageText && isNaN(parseInt(percentageText))) {
            return { color: fallbackColor };
        }

        const percentage = percentageText ? 1 + (parseInt(percentageText) / 100) : 1;
        const channel = ChannelStore.getChannel(channelId);
        const member = channel ? GuildMemberStore.getMember(channel.guild_id, userId) : null;
        const roleColor = member?.colorString;

        if (!roleColor) {
            return { color: fallbackColor };
        }

        return { color: roleColor, filter: `brightness(${percentage})` };
    } else {
        return { color: savedColor };
    }
}

interface UsernameProps {
    author: { nick: string; };
    message: Message;
    withMentionPrefix?: boolean;
    isRepliedMessage: boolean;
    userOverride?: User;
}

const settings = definePluginSettings({
    replies: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also display extra names in reply previews.",
    },
    respectStreamerMode: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Truncate usernames in Streamer Mode as Discord does everywhere else.",
    },
    includedNames: {
        type: OptionType.SELECT,
        description: "The order to display usernames, nicknames, and display names. If any overlap or do not exist, they will be omitted. Regardless of your selection below, if nickname or display name are missing, the other will be used. If both are missing, username will be used.",
        default: "nick_user",
        options: [
            { label: "Nickname", value: "nick" },
            { label: "Display Name", value: "display" },
            { label: "Username", value: "user" },

            { label: "Nickname (Username)", value: "nick_user", default: true },
            { label: "Nickname (Display Name)", value: "nick_display" },
            { label: "Display Name (Username)", value: "display_user" },
            { label: "Display Name (Nickname)", value: "display_nick" },
            { label: "Username (Nickname)", value: "user_nick" },
            { label: "Username (Display Name)", value: "user_display" },

            { label: "Nickname (Username) [Display Name]", value: "nick_user_display" },
            { label: "Nickname (Display Name) [Username]", value: "nick_display_user" },
            { label: "Display (Name Username) [Nickname]", value: "display_user_nick" },
            { label: "Display (Name Nickname) [Username]", value: "display_nick_user" },
            { label: "Username (Nickname) [Display Name]", value: "user_nick_display" },
            { label: "Username (Display Name) [Nickname]", value: "user_display_nick" },
        ],
    },
    nicknamePrefix: {
        type: OptionType.STRING,
        description: "The symbol to use as a prefix for the nickname. Can be up to 3 non-alphanumeric characters long.",
        default: "",
        isValid: validSymbols,
    },
    nicknameSuffix: {
        type: OptionType.STRING,
        description: "The symbol to use as a suffix for the nickname. Can be up to 3 non-alphanumeric characters long.",
        default: "",
        isValid: validSymbols,
    },
    nicknameColor: {
        type: OptionType.STRING,
        description: "The color to use for the nickname. Accepts hex(a), rgb(a), or hsl(a) input. Will not affect the nickname if it is the only name displayed. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "",
        isValid: validColor,
    },
    nicknameSymbolColor: {
        type: OptionType.STRING,
        description: "The color to use for nickname symbols. Accepts hex(a), rgb(a), or hsl(a) input. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "",
        isValid: validColor,
    },
    alwaysShowNicknameSymbols: {
        type: OptionType.BOOLEAN,
        description: "Show nickname prefix and suffix even if the nickname is the only name displayed, or is the first displayed.",
        default: false,
    },
    displayNamePrefix: {
        type: OptionType.STRING,
        description: "The symbol to use as a prefix for the display name. Can be up to 3 non-alphanumeric characters long.",
        default: "[",
        isValid: validSymbols,
    },
    displayNameSuffix: {
        type: OptionType.STRING,
        description: "The symbol to use as a suffix for the display name. Can be up to 3 non-alphanumeric characters long.",
        default: "]",
        isValid: validSymbols,
    },
    displayNameColor: {
        type: OptionType.STRING,
        description: "The color to use for the display name. Accepts hex(a), rgb(a), or hsl(a) input. Will not affect the display name if it is the only name displayed. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "",
        isValid: validColor,
    },
    displayNameSymbolColor: {
        type: OptionType.STRING,
        description: "The color to use for display name symbols. Accepts hex(a), rgb(a), or hsl(a) input. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "",
        isValid: validColor,
    },
    alwaysShowDisplaySymbols: {
        type: OptionType.BOOLEAN,
        description: "Show display name prefix and suffix even if the display name is the only name displayed, or is the first displayed.",
        default: false,
    },
    usernamePrefix: {
        type: OptionType.STRING,
        description: "The symbol to use as a prefix for the username. Can be up to 3 non-alphanumeric characters long.",
        default: "(@",
        isValid: validSymbols,
    },
    usernameSuffix: {
        type: OptionType.STRING,
        description: "The symbol to use as a suffix for the username. Can be up to 3 non-alphanumeric characters long.",
        default: ")",
        isValid: validSymbols,
    },
    usernameColor: {
        type: OptionType.STRING,
        description: "The color to use for the username. Accepts hex(a), rgb(a), or hsl(a) input. Will not affect the username if it is the only name displayed. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "",
        isValid: validColor,
    },
    usernameSymbolColor: {
        type: OptionType.STRING,
        description: "The color to use for username symbols. Accepts hex(a), rgb(a), or hsl(a) input. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "",
        isValid: validColor,
    },
    alwaysShowUsernameSymbols: {
        type: OptionType.BOOLEAN,
        description: "Show username prefix and suffix even if the username is the only name displayed, or is the first displayed.",
        default: false,
    }
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames, nicknames, display names, or any combination thereof in chat. Nicknames are per-server and display names are global. You will need to hover over old messages to update them after changing any settings.",
    authors: [Devs.Rini, Devs.TheKodeToad, Devs.Etorix],
    patches: [
        {
            find: '?"@":""',
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\)}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
    ],
    settings,

    renderUsername: ErrorBoundary.wrap(({ author, message, isRepliedMessage, userOverride }: UsernameProps) => {
        const user: any = userOverride ?? message.author;
        const username = StreamerModeStore.enabled && settings.store.respectStreamerMode ? user.username[0] + "..." : user.username;
        const display = StreamerModeStore.enabled && settings.store.respectStreamerMode && user.globalName?.toLowerCase() === user.username.toLowerCase() ? user.globalName[0] + "..." : user.globalName || "";
        const nick = StreamerModeStore.enabled && settings.store.respectStreamerMode && author?.nick?.toLowerCase() === user.username.toLowerCase() ? author.nick[0] + "..." : author?.nick || "";

        try {
            if (isRepliedMessage && !settings.store.replies) {
                return <>{nick || display || username}</>;
            }

            const textMutedValue = getComputedStyle(document.documentElement)?.getPropertyValue("--text-muted")?.trim() || "#72767d";
            const { alwaysShowUsernameSymbols, alwaysShowNicknameSymbols, alwaysShowDisplaySymbols } = settings.store;
            const usernamePrefix = settings.store.usernamePrefix === "none" ? "" : settings.store.usernamePrefix;
            const usernameSuffix = settings.store.usernameSuffix === "none" ? "" : settings.store.usernameSuffix;
            const usernameColor = resolveColor(message.channel_id, user.id, settings.store.usernameColor.trim(), textMutedValue);
            const usernameSymbolColor = resolveColor(message.channel_id, user.id, settings.store.usernameSymbolColor.trim(), textMutedValue);
            const nicknamePrefix = settings.store.nicknamePrefix === "none" ? "" : settings.store.nicknamePrefix;
            const nicknameSuffix = settings.store.nicknameSuffix === "none" ? "" : settings.store.nicknameSuffix;
            const nicknameColor = resolveColor(message.channel_id, user.id, settings.store.nicknameColor.trim(), textMutedValue);
            const nicknameSymbolColor = resolveColor(message.channel_id, user.id, settings.store.nicknameSymbolColor.trim(), textMutedValue);
            const displayNamePrefix = settings.store.displayNamePrefix === "none" ? "" : settings.store.displayNamePrefix;
            const displayNameSuffix = settings.store.displayNameSuffix === "none" ? "" : settings.store.displayNameSuffix;
            const displayNameColor = resolveColor(message.channel_id, user.id, settings.store.displayNameColor.trim(), textMutedValue);
            const displayNameSymbolColor = resolveColor(message.channel_id, user.id, settings.store.displayNameSymbolColor.trim(), textMutedValue);

            const values = {
                "user": { "value": username, "prefix": usernamePrefix, "suffix": usernameSuffix, "alwaysShow": alwaysShowUsernameSymbols, "color": usernameColor, "symbolColor": usernameSymbolColor },
                "display": { "value": display, "prefix": displayNamePrefix, "suffix": displayNameSuffix, "alwaysShow": alwaysShowDisplaySymbols, "color": displayNameColor, "symbolColor": displayNameSymbolColor },
                "nick": { "value": nick, "prefix": nicknamePrefix, "suffix": nicknameSuffix, "alwaysShow": alwaysShowNicknameSymbols, "color": nicknameColor, "symbolColor": nicknameSymbolColor }
            };

            let order = settings.store.includedNames.split("_");
            order.includes("nick") && !values.nick.value && !order.includes("display") && values.display.value ? order[order.indexOf("nick")] = "display" : null;
            order.includes("display") && !values.display.value && !order.includes("user") && values.user.value ? order[order.indexOf("display")] = "user" : null;
            order = order.filter((name: string) => values[name].value);

            const first = order.shift() || "user";
            let second = order.shift() || null;
            let third = order.shift() || null;
            // Override the display name if it is just an alternate capitalization of the username and they are in the second and third positions.
            second === "display" && third === "user" && values[second].value.toLowerCase() === values[third].value.toLowerCase() ? second = null : null;
            // If third is the same as second, remove it.
            second && third && values[third].value.toLowerCase() === values[second].value.toLowerCase() ? third = null : null;
            // If second is the same as first, remove it.
            second && values[second].value.toLowerCase() === values[first].value.toLowerCase() ? second = null : null;
            // If third is the same as first, remove it. Occurs if all three names are actually set and are the same.
            third && values[third].value.toLowerCase() === values[first].value.toLowerCase() ? third = null : null;

            return (
                <>
                    {(
                        <span>
                            {values[first].alwaysShow ? values[first].prefix : ""}
                            {values[first].value}
                            {values[first].alwaysShow ? values[first].suffix : ""}
                        </span>
                    )}
                    {second && (
                        <span>
                            <span>&nbsp;</span>
                            <span style={values[second].symbolColor}>
                                {values[second].prefix}</span>
                            <span style={values[second].color}>
                                {values[second].value}</span>
                            <span style={values[second].symbolColor}>
                                {values[second].suffix}</span>
                        </span>
                    )}
                    {third && (
                        <span>
                            <span>&nbsp;</span>
                            <span style={values[third].symbolColor}>
                                {values[third].prefix}</span>
                            <span style={values[third].color}>
                                {values[third].value}</span>
                            <span style={values[third].symbolColor}>
                                {values[third].suffix}</span>
                        </span>
                    )}
                </>
            );
        } catch {
            return <>{StreamerModeStore.enabled && settings.store.respectStreamerMode ? ((nick || display || username)[0] + "...") : (nick || display || username)}</>;
        }
    }, { noop: true }),
});
