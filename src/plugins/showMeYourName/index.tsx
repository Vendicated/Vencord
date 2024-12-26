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

function resolveColor(user: User | GuildMember, savedColor: string, fallbackColor: string) {
    if (!savedColor.trim()) {
        return { color: fallbackColor };
    }

    if (savedColor.toLowerCase().includes("role")) {
        const percentageText = roleColorPattern.exec(savedColor)?.[1] || "";
        if (percentageText && isNaN(parseInt(percentageText))) {
            return { color: fallbackColor };
        }

        const percentage = percentageText ? 1 + (parseInt(percentageText) / 100) : 1;
        const roleColor = (user as GuildMember)?.colorString || null;

        if (!roleColor) {
            return { color: fallbackColor };
        }

        return { color: roleColor, filter: `brightness(${percentage})` };
    } else {
        return { color: savedColor };
    }
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
        type: OptionType.SELECT,
        description: "The order to display usernames, nicknames, and display names. If any do not exist for the user, they will be omitted. Regardless of your selection below, if nickname or display name are missing, the other will replace it. If both are missing, username will be used.",
        default: "nick_display_user",
        options: [
            { label: "Nickname", value: "nick" },
            { label: "Display Name", value: "display" },
            { label: "Username", value: "user" },

            { label: "Nickname (Username)", value: "nick_user" },
            { label: "Nickname (Display Name)", value: "nick_display" },
            { label: "Display Name (Username)", value: "display_user" },
            { label: "Display Name (Nickname)", value: "display_nick" },
            { label: "Username (Nickname)", value: "user_nick" },
            { label: "Username (Display Name)", value: "user_display" },

            { label: "Nickname (Username) [Display Name]", value: "nick_user_display" },
            { label: "Nickname (Display Name) [Username]", value: "nick_display_user", default: true },
            { label: "Display Name (Username) [Nickname]", value: "display_user_nick" },
            { label: "Display Name (Nickname) [Username]", value: "display_nick_user" },
            { label: "Username (Nickname) [Display Name]", value: "user_nick_display" },
            { label: "Username (Display Name) [Nickname]", value: "user_display_nick" },
        ],
    },
    nicknamePrefix: {
        type: OptionType.STRING,
        description: "The symbol to use as a prefix for the nickname. Can be up to 3 non-alphanumeric characters long.",
        default: "(",
        isValid: validSymbols,
    },
    nicknameSuffix: {
        type: OptionType.STRING,
        description: "The symbol to use as a suffix for the nickname. Can be up to 3 non-alphanumeric characters long.",
        default: ")",
        isValid: validSymbols,
    },
    nicknameColor: {
        type: OptionType.STRING,
        description: "The color to use for the nickname. Accepts hex(a), rgb(a), or hsl(a) input. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
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
    alwaysShowNicknameColor: {
        type: OptionType.BOOLEAN,
        description: "Show nickname color even if the nickname is the only name displayed, or is the first displayed.",
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
        description: "The color to use for the display name. Accepts hex(a), rgb(a), or hsl(a) input. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
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
    alwaysShowDisplayColor: {
        type: OptionType.BOOLEAN,
        description: "Show display name color even if the display name is the only name displayed, or is the first displayed.",
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
        description: "The color to use for the username. Accepts hex(a), rgb(a), or hsl(a) input. Leave blank for default. \"Role\" to follow the user's top role color. \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
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
    },
    alwaysShowUsernameColor: {
        type: OptionType.BOOLEAN,
        description: "Show username color even if the username is the only name displayed, or is the first displayed.",
        default: false,
    }
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display any permutation of nicknames, display names, and usernames in chat. Nicknames are per-server and display names are global. You will need to hover over old messages to update them after changing any settings.",
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
        const renderType = props.className === "mention" ? "mention" : "message";
        let author, isRepliedMessage;
        let mentionSymbol = "";

        if (renderType === "mention") {
            const channel = ChannelStore.getChannel(props.channelId) || {};
            const usr = UserStore.getUser(props.userId) || {};
            const mem = GuildMemberStore.getMember(channel.guild_id, props.userId) || {};
            author = { ...usr, ...mem };
            isRepliedMessage = false;
            mentionSymbol = settings.store.hideDefaultAtSign ? "" : "@";
        } else if (renderType === "message") {
            // props.message.author only has a globalName attribute.
            // props.author only has a nick attribute, but it is overwritten by the globalName if no nickname is set.
            // getUser only has a globalName attribute.
            // getMember only has a nick attribute, and it is null if no nickname is set.
            // Therefore just using the author props is not enough for an accurate result and we instead need to combine the results of getUser and getMember.
            const channel = ChannelStore.getChannel(props.message.channel_id) || {};
            const usr = UserStore.getUser(props.message.author.id) || {};
            const mem = GuildMemberStore.getMember(channel.guild_id, props.message.author.id) || {};
            author = { ...usr, ...mem };
            isRepliedMessage = props.isRepliedMessage;
            mentionSymbol = settings.store.hideDefaultAtSign ? "" : props.withMentionPrefix ? "@" : "";
        }

        if (!author) {
            return <>{mentionSymbol}Unknown</>;
        }

        const user: any = author;
        const username = StreamerModeStore.enabled && settings.store.respectStreamerMode ? user.username[0] + "..." : user.username;
        const display = StreamerModeStore.enabled && settings.store.respectStreamerMode && user.globalName?.toLowerCase() === user.username.toLowerCase() ? user.globalName[0] + "..." : user.globalName || "";
        const nick = StreamerModeStore.enabled && settings.store.respectStreamerMode && author?.nick?.toLowerCase() === user.username.toLowerCase() ? author.nick[0] + "..." : author?.nick || "";

        try {
            if (isRepliedMessage && !settings.store.replies) {
                return <>{mentionSymbol}{nick || display || username}</>;
            }

            const textMutedValue = getComputedStyle(document.documentElement)?.getPropertyValue("--text-muted")?.trim() || "#72767d";
            const { alwaysShowUsernameSymbols, alwaysShowNicknameSymbols, alwaysShowDisplaySymbols, alwaysShowUsernameColor, alwaysShowNicknameColor, alwaysShowDisplayColor } = settings.store;
            const { usernamePrefix, usernameSuffix, nicknamePrefix, nicknameSuffix, displayNamePrefix, displayNameSuffix } = settings.store;
            const usernameColor = resolveColor(user, settings.store.usernameColor.trim(), textMutedValue);
            const usernameSymbolColor = resolveColor(user, settings.store.usernameSymbolColor.trim(), textMutedValue);
            const nicknameColor = resolveColor(user, settings.store.nicknameColor.trim(), textMutedValue);
            const nicknameSymbolColor = resolveColor(user, settings.store.nicknameSymbolColor.trim(), textMutedValue);
            const displayNameColor = resolveColor(user, settings.store.displayNameColor.trim(), textMutedValue);
            const displayNameSymbolColor = resolveColor(user, settings.store.displayNameSymbolColor.trim(), textMutedValue);

            const values = {
                "user": { "value": username, "prefix": usernamePrefix, "suffix": usernameSuffix, "alwaysShowSymbols": alwaysShowUsernameSymbols, "alwaysShowColor": alwaysShowUsernameColor, "color": usernameColor, "symbolColor": usernameSymbolColor },
                "display": { "value": display, "prefix": displayNamePrefix, "suffix": displayNameSuffix, "alwaysShowSymbols": alwaysShowDisplaySymbols, "alwaysShowColor": alwaysShowDisplayColor, "color": displayNameColor, "symbolColor": displayNameSymbolColor },
                "nick": { "value": nick, "prefix": nicknamePrefix, "suffix": nicknameSuffix, "alwaysShowSymbols": alwaysShowNicknameSymbols, "alwaysShowColor": alwaysShowNicknameColor, "color": nicknameColor, "symbolColor": nicknameSymbolColor }
            };

            let order = settings.store.includedNames.split("_");
            order.includes("nick") && !values.nick.value && !order.includes("display") && values.display.value ? order[order.indexOf("nick")] = "display" : null;
            order.includes("display") && !values.display.value && !order.includes("user") && values.user.value ? order[order.indexOf("display")] = "user" : null;
            order = order.filter((name: string) => values[name].value);

            const first = order.shift() || "user";
            let second = order.shift() || null;
            let third = order.shift() || null;

            if (settings.store.removeDuplicates) {
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
                            {values[first].alwaysShowSymbols && <span style={values[first].symbolColor}>
                                {values[first].prefix}</span>}
                            {values[first].alwaysShowColor && <span style={values[first].color}>
                                {values[first].value}</span>}
                            {!values[first].alwaysShowColor && <span>
                                {values[first].value}</span>}
                            {values[first].alwaysShowSymbols && <span style={values[first].symbolColor}>
                                {values[first].suffix}</span>}
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
        } catch (e) {
            console.error(e);
            return <>{mentionSymbol}{StreamerModeStore.enabled && settings.store.respectStreamerMode ? ((nick || display || username)[0] + "...") : (nick || display || username)}</>;
        }
    }, { noop: true }),
});
