/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { Button, ErrorBoundary, Heading, TextButton } from "@components/index";
import mentionAvatars from "@plugins/mentionAvatars";
import { Devs, EquicordDevs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/index";
import definePlugin, { OptionType } from "@utils/types";
import { GuildMember, Message, User } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, GuildStore, Menu, MessageStore, RelationshipStore, StreamerModeStore, TextInput, useEffect, UserStore, useState } from "@webpack/common";
import { JSX } from "react";

const wrapEmojis = findByCodeLazy("lastIndex;return");
const AccessibilityStore = findStoreLazy("AccessibilityStore");
const colorPattern = /^#(?:[\da-f]{3}){1,2}$|^#(?:[\da-f]{4}){1,2}$|(rgb|hsl)a?\((\s*-?\d+%?\s*,){2}(\s*-?\d+%?\s*)\)|(rgb|hsl)a?\((\s*-?\d+%?\s*,){3}\s*(0|(0?\.\d+)|1)\)$/iu;
const roleColorPattern = /^role((?:\+|-)\d{0,4})?$/iu;
const symbolPattern = /^[\p{S}\p{P}]{1,3}$/iu;
const templatePattern = /(?:\{(?:custom|friend|nick|display|user)(?:,\s*(?:custom|friend|nick|display|user))*\})/iu;

type CustomNicknameData = Record<string, string>;
let customNicknames: CustomNicknameData = {};

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

function resolveColor(user: User | GuildMember, savedColor: string, fallbackColor: string, canUseGradient: boolean): any {
    const fallbackReturn = {
        normal: {
            original: {
                color: fallbackColor,
                "text-decoration-color": fallbackColor
            },
            adjusted: {
                color: fallbackColor,
                "text-decoration-color": fallbackColor
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
        if (percentage && isNaN(parseInt(percentage))) return fallbackReturn;

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
    }

    gradient = !canUseGradient || !secondaryColor
        ? null
        : tertiaryColor
            ? "linear-gradient(to right,var(--custom-gradient-color-1),var(--custom-gradient-color-2),var(--custom-gradient-color-3),var(--custom-gradient-color-1))"
            : "linear-gradient(to right,var(--custom-gradient-color-1),var(--custom-gradient-color-2),var(--custom-gradient-color-1))";

    const baseNormalStyle = {
        "isolation": "isolate"
    };

    const baseGradientStyle = {
        "background-clip": "text",
        "background-size": "100px auto",
        "-webkit-text-fill-color": "transparent",
        "-webkit-background-clip": "text",
        "isolation": "isolate"
    };

    return {
        normal: {
            original: { ...baseNormalStyle, "color": primaryColor, "text-decoration-color": primaryColor, "-webkit-text-fill-color": primaryColor },
            adjusted: { ...baseNormalStyle, "color": primaryAdjusted, "text-decoration-color": primaryAdjusted, "-webkit-text-fill-color": primaryAdjusted },
        },
        gradient: gradient ? {
            animated: {
                ...baseGradientStyle,
                "color": primaryColor,
                "text-decoration-color": primaryColor,
                "--custom-gradient-color-1": primaryColor,
                "--custom-gradient-color-2": secondaryColor || primaryColor,
                "--custom-gradient-color-3": tertiaryColor || primaryColor,
                "background-image": gradient,
                "animation": "show-me-your-name-animation 1.5s linear infinite"
            },
            static: {
                original: {
                    ...baseGradientStyle,
                    "color": primaryColor,
                    "text-decoration-color": primaryColor,
                    "--custom-gradient-color-1": primaryColor,
                    "--custom-gradient-color-2": secondaryColor || primaryColor,
                    "--custom-gradient-color-3": tertiaryColor || primaryColor,
                    "background-image": gradient,
                },
                adjusted: {
                    ...baseGradientStyle,
                    "color": primaryAdjusted,
                    "text-decoration-color": primaryAdjusted,
                    "--custom-gradient-color-1": primaryAdjusted,
                    "--custom-gradient-color-2": secondaryAdjusted || primaryAdjusted,
                    "--custom-gradient-color-3": tertiaryAdjusted || primaryAdjusted,
                    "background-image": gradient,
                },
            }
        } : null,
    };
}

function splitTemplate(template: string) {
    const items = template.trim().split(/(?<!,\s*)\s+/);
    return items;
}

function parseTemplateItem(entry: string) {
    const [prefix, suffix] = entry.split(templatePattern);
    const names = entry.replace(prefix, "").replace(suffix, "").trim().replaceAll(/{|}/g, "").split(/,\s*/);

    return {
        prefix: prefix ? prefix.trim() : "",
        suffix: suffix ? suffix.trim() : "",
        targetProcessedNames: names.map(name => name.trim()).filter(name => name.length > 0)
    };
}

function validTemplate(value: string) {
    const items = splitTemplate(value);

    if (items.length > 4 || !items.length) {
        return false;
    }

    const invalidOptions = items.some(item => {
        const { prefix, suffix, targetProcessedNames } = parseTemplateItem(item);

        return (
            prefix.length > 3 ||
            suffix.length > 3 ||
            (!!prefix && !symbolPattern.test(prefix)) ||
            (!!suffix && !symbolPattern.test(suffix)) ||
            targetProcessedNames.length > 5 ||
            targetProcessedNames.some(name => !["custom", "friend", "nick", "display", "user"].includes(name.trim()))
        );
    });

    if (invalidOptions) {
        return false;
    }
}

function getProcessedNames(author: any, truncateAllNamesWithStreamerMode: boolean, discriminators: boolean): {
    username: string | null;
    display: string | null;
    nick: string | null;
    friend: string | null;
    custom: string | null;
} {
    let discriminator: string | null = null;

    if (discriminators) {
        const userAuthor = author as User | null;

        if (userAuthor?.bot && !isNaN(userAuthor?.discriminator as any) && Number(userAuthor?.discriminator) !== 0) {
            discriminator = userAuthor.discriminator;

            if (!!userAuthor) {
                userAuthor.globalName = userAuthor.username;
            }
        }
    }

    const username: string | null = !author?.username ? null
        : StreamerModeStore.enabled
            ? author.username[0] + "..."
            : author.username as string + (discriminator ? `#${discriminator}` : "");

    const display: string | null = !author?.globalName ? null
        : StreamerModeStore.enabled && (truncateAllNamesWithStreamerMode || author.globalName.toLowerCase() === author.username.toLowerCase())
            ? author.globalName[0] + "..."
            : author.globalName as string;

    const nick: string | null = !author?.nick ? null
        : StreamerModeStore.enabled && (truncateAllNamesWithStreamerMode || author.nick.toLowerCase() === author.username.toLowerCase())
            ? author.nick[0] + "..."
            : author.nick as string;

    const friendName: string | null = author ? RelationshipStore.getNickname(author.id) || null : null;
    const friend: string | null = !friendName ? null
        : StreamerModeStore.enabled && (truncateAllNamesWithStreamerMode || friendName.toLowerCase() === author.username.toLowerCase())
            ? friendName[0] + "..."
            : friendName as string;

    const customName: string | null = !author?.id ? null : customNicknames[author.id] || null;
    const custom: string | null = !customName ? null
        : StreamerModeStore.enabled && (truncateAllNamesWithStreamerMode || customName.toLowerCase() === author.username.toLowerCase())
            ? customName[0] + "..."
            : customName;

    return { username, display, nick, friend, custom };
}

interface mentionProps {
    userId: string;
    channelId?: string;
    props?: {
        messageId?: string;
        groupId?: string;
    },
}

interface messageProps {
    message: Message;
    userOverride?: User;
    isRepliedMessage?: boolean;
    withMentionPrefix?: boolean;
}

interface memberListProfileReactionProps {
    user: User;
    type: "membersList" | "profilesPopout" | "profilesTooltip" | "reactionsTooltip" | "reactionsPopout" | "voiceChannel";
    guildId?: string;
    tags?: any;
}

function getMemberListProfilesReactionsVoiceName(
    props: memberListProfileReactionProps,
): [string | null, JSX.Element | null, string | null] {
    const { user, type } = props;
    // props.guildId for member list & preview profile, props.tags.props.displayProfile.guildId
    // for full guild profile and main profile, which is indicated by whether it is null or not.
    const guildId = props.guildId || props.tags?.props?.displayProfile?.guildId || null;
    const member = guildId ? GuildMemberStore.getMember(guildId, user.id) : null;
    const author = user && member ? { ...user, ...member } : user || member || null;
    const shouldHookless = type === "reactionsTooltip" || type === "profilesTooltip";
    return renderUsername(author, null, null, type, "", shouldHookless);
}

function getMemberListProfilesReactionsVoiceNameText(props: memberListProfileReactionProps): string | null {
    return getMemberListProfilesReactionsVoiceName(props)[2];
}

function getMemberListProfilesReactionsVoiceNameElement(props: memberListProfileReactionProps): JSX.Element | null {
    return getMemberListProfilesReactionsVoiceName(props)[1];
}

function getMessageName(props: messageProps): [string | null, JSX.Element | null, string | null] {
    const { hideDefaultAtSign, replies } = settings.use(["hideDefaultAtSign", "replies"]);
    const { message, userOverride, isRepliedMessage, withMentionPrefix } = props;
    const isWebhook = !!message.webhookId && !message.interaction;
    const channel = ChannelStore.getChannel(message.channel_id) || {};
    const target = userOverride || message.author;
    const user = isWebhook ? target : UserStore.getUser(target.id);
    const member = isWebhook ? null : GuildMemberStore.getMember(channel.guild_id, target.id);
    const author = user && member ? { ...user, ...member } : user || member || null;
    const mentionSymbol = hideDefaultAtSign && (!isRepliedMessage || replies) ? "" : withMentionPrefix ? "@" : "";
    return renderUsername(author, channel.id, message.id, isRepliedMessage ? "replies" : "messages", mentionSymbol);
}

function getMessageNameElement(props: messageProps): JSX.Element | null {
    return getMessageName(props)[1];
}

function getMessageNameText(props: messageProps): string | null {
    return getMessageName(props)[0];
}

export function getMentionNameElement(props: mentionProps): JSX.Element | null {
    const { hideDefaultAtSign, mentions } = settings.use(["hideDefaultAtSign", "mentions"]);
    const { channelId, userId, props: nestedProps } = props;
    const channel = channelId ? ChannelStore.getChannel(channelId) || null : null;
    const user = UserStore.getUser(userId);
    const member = channel ? GuildMemberStore.getMember(channel.guild_id, userId) : null;
    const author = user && member ? { ...user, ...member } : user || member || null;
    const mentionSymbol = hideDefaultAtSign && mentions ? "" : "@";
    return renderUsername(author, channelId || null, nestedProps?.messageId || null, "mentions", mentionSymbol)[1];
}

function renderUsername(
    author: User | GuildMember | null,
    channelId: string | null,
    messageId: string | null,
    type: "messages" | "replies" | "mentions" | "membersList" | "profilesPopout" | "profilesTooltip" | "reactionsTooltip" | "reactionsPopout" | "voiceChannel",
    mentionSymbol: string,
    hookless = false
): [string | null, JSX.Element | null, string | null] {
    const isMessage = type === "messages";
    const isReply = type === "replies";
    const isMention = type === "mentions";
    const isMember = type === "membersList";
    const isProfile = type === "profilesPopout";
    const isReactionsPopout = type === "reactionsPopout";
    const isReactionsTooltip = type === "reactionsTooltip";
    const isReaction = isReactionsTooltip || isReactionsPopout;
    const isVoice = type === "voiceChannel";

    const config = hookless ? settings.store : settings.use(["messages", "replies", "mentions", "memberList", "profilePopout", "reactions", "discriminators", "hideDefaultAtSign", "truncateAllNamesWithStreamerMode", "removeDuplicates", "ignoreGradients", "ignoreFonts", "animateGradients", "includedNames", "customNameColor", "friendNameColor", "nicknameColor", "displayNameColor", "usernameColor", "nameSeparator", "triggerNameRerender"]);
    const { messages, replies, mentions, memberList, profilePopout, reactions, discriminators, hideDefaultAtSign, truncateAllNamesWithStreamerMode, removeDuplicates, ignoreGradients, ignoreFonts, animateGradients, includedNames, customNameColor, friendNameColor, nicknameColor, displayNameColor, usernameColor, nameSeparator, triggerNameRerender } = config;

    const canUseGradient = ((author as GuildMember)?.guildId ? (GuildStore.getGuild((author as GuildMember).guildId) ?? {}).premiumFeatures?.features.includes("ENHANCED_ROLE_COLORS") : false);
    const textMutedValue = getComputedStyle(document.documentElement)?.getPropertyValue("--text-muted")?.trim() || "#72767d";
    const options = splitTemplate(includedNames);
    const resolvedUsernameColor = author ? resolveColor(author, usernameColor.trim(), "", canUseGradient) : null;
    const resolvedDisplayNameColor = author ? resolveColor(author, displayNameColor.trim(), "", canUseGradient) : null;
    const resolvedNicknameColor = author ? resolveColor(author, nicknameColor.trim(), "", canUseGradient) : null;
    const resolvedFriendNameColor = author ? resolveColor(author, friendNameColor.trim(), "", canUseGradient) : null;
    const resolvedCustomNameColor = author ? resolveColor(author, customNameColor.trim(), "", canUseGradient) : null;
    const affixColor = { color: textMutedValue, "-webkit-text-fill-color": textMutedValue, isolation: "isolate", "white-space": "pre", "font-family": "var(--font-primary)", "letter-spacing": "normal" };
    const { username, display, nick, friend, custom } = getProcessedNames(author, truncateAllNamesWithStreamerMode, discriminators);

    const names: Record<string, [string | null, object | null]> = {
        user: [username, resolvedUsernameColor],
        display: [display, resolvedDisplayNameColor],
        nick: [nick, resolvedNicknameColor],
        friend: [friend, resolvedFriendNameColor],
        custom: [custom, resolvedCustomNameColor]
    };

    const outputs: any[] = [];

    for (const option of options) {
        const { prefix, suffix, targetProcessedNames } = parseTemplateItem(option);
        let chosenName: string | null = null;
        let chosenStyle: object | null = null;
        let chosenType = "";

        for (const name of targetProcessedNames) {
            if (!names[name]) {
                continue;
            }

            chosenName = names[name][0];
            chosenStyle = names[name][1];
            chosenType = name;

            if (chosenName) {
                break;
            }
        }

        if (!chosenName || !chosenStyle) {
            continue;
        }

        outputs.push({
            prefix: prefix || "",
            name: chosenName,
            wrapped: chosenName,
            type: chosenType,
            suffix: suffix || "",
            style: chosenStyle as React.CSSProperties
        });
    }

    if (!outputs.length) {
        outputs.push({
            prefix: "",
            name: username || "Unknown",
            wrapped: username || "Unknown",
            suffix: "",
            style: resolvedUsernameColor
        });
    }

    let first = outputs.shift();
    let second = outputs.shift();
    let third = outputs.shift();
    let fourth = outputs.shift();
    let fifth = outputs.shift();

    const firstValueWrapped = hookless ?
        (first.name || "")
        : wrapEmojis(first.name || "");

    const secondValueWrapped = hookless ?
        ((second ?? {}).name || "")
        : wrapEmojis((second ?? {}).name || "");

    const thirdValueWrapped = hookless ?
        ((third ?? {}).name || "")
        : wrapEmojis((third ?? {}).name || "");

    const fourthValueWrapped = hookless ?
        ((fourth ?? {}).name || "")
        : wrapEmojis((fourth ?? {}).name || "");

    const fifthValueWrapped = hookless ?
        ((fifth ?? {}).name || "")
        : wrapEmojis((fifth ?? {}).name || "");

    first.wrapped = firstValueWrapped;
    second && (second.wrapped = secondValueWrapped);
    third && (third.wrapped = thirdValueWrapped);
    fourth && (fourth.wrapped = fourthValueWrapped);
    fifth && (fifth.wrapped = fifthValueWrapped);

    if (isMessage && !messages) {
        return [null, null, null];
    } else if (isReply && !replies) {
        return [null, null, null];
    } else if (isMention && !mentions) {
        return [null, null, null];
    } else if (isMember && !memberList) {
        return [null, null, null];
    } else if (isProfile && !profilePopout) {
        return [null, null, null];
    } else if (isReaction && !reactions) {
        return [null, null, null];
    } else if (isVoice && !reactions) {
        return [null, null, null];
    } else if (!author || !username) {
        const fallbackText = `${mentionSymbol}Unknown`;
        return [fallbackText, <>{fallbackText}</>, fallbackText];
    }

    const prioritizeUsername = (new Set([first, second, third, fourth, fifth].filter(Boolean).map(pos => pos.name.toLowerCase())).size > 1);

    if (removeDuplicates) {
        // Remove duplicates from back to front. Prioritize the earlier name, unless it's the username and there's more than one unique option, then prioritize it.
        fifth && fourth && fifth.name.toLowerCase() === fourth.name.toLowerCase() ? fifth.type === "user" && prioritizeUsername ? fourth = null : fifth = null : null;
        fifth && third && fifth.name.toLowerCase() === third.name.toLowerCase() ? fifth.type === "user" && prioritizeUsername ? third = null : fifth = null : null;
        fifth && second && fifth.name.toLowerCase() === second.name.toLowerCase() ? fifth.type === "user" && prioritizeUsername ? second = null : fifth = null : null;
        fifth && first && fifth.name.toLowerCase() === first.name.toLowerCase() ? fifth.type === "user" && prioritizeUsername ? first = null : fifth = null : null;
        fourth && third && fourth.name.toLowerCase() === third.name.toLowerCase() ? fourth.type === "user" && prioritizeUsername ? third = null : fourth = null : null;
        fourth && second && fourth.name.toLowerCase() === second.name.toLowerCase() ? fourth.type === "user" && prioritizeUsername ? second = null : fourth = null : null;
        fourth && first && fourth.name.toLowerCase() === first.name.toLowerCase() ? fourth.type === "user" && prioritizeUsername ? first = null : fourth = null : null;
        third && second && third.name.toLowerCase() === second.name.toLowerCase() ? third.type === "user" && prioritizeUsername ? second = null : third = null : null;
        third && first && third.name.toLowerCase() === first.name.toLowerCase() ? third.type === "user" && prioritizeUsername ? first = null : third = null : null;
        second && first && second.name.toLowerCase() === first.name.toLowerCase() ? second.type === "user" && prioritizeUsername ? first = null : second = null : null;
    }

    const remainingNames = [first, second, third, fourth, fifth].filter(Boolean);
    first = remainingNames.shift();
    second = remainingNames.shift();
    third = remainingNames.shift();
    fourth = remainingNames.shift();
    fifth = remainingNames.shift();

    const useTopRoleStyle = isMention || isReactionsPopout;
    const topRoleStyle = resolveColor(author, "Role", "", canUseGradient);
    const hasGradient = !!topRoleStyle?.gradient && Object.keys(topRoleStyle.gradient).length > 0;
    const message = channelId && messageId ? MessageStore.getMessage(channelId, messageId) : null;
    const groupId = (message as any)?.showMeYourNameGroupId || null;

    const isHovering = (isMessage || isReply || isMention)
        ? ((messageId && hoveringMessageMap.has(messageId)) || (groupId && hoveringMessageMap.has(groupId)))
        : isReactionsPopout
            ? hoveringReactionPopoutSet.has((author as User).id)
            : false;

    const shouldGradientGlow = isHovering && hasGradient;
    const shouldAnimateGradients = shouldGradientGlow && !AccessibilityStore.useReducedMotion;
    const shouldAnimateSecondaryNames = animateGradients && !ignoreGradients;

    const firstDataText = mentionSymbol + first.name;
    const secondDataText = second && shouldAnimateSecondaryNames ? (second.prefix + second.name + second.suffix) : "";
    const thirdDataText = third && shouldAnimateSecondaryNames ? (third.prefix + third.name + third.suffix) : "";
    const fourthDataText = fourth && shouldAnimateSecondaryNames ? (fourth.prefix + fourth.name + fourth.suffix) : "";
    const fifthDataText = fifth && shouldAnimateSecondaryNames ? (fifth.prefix + fifth.name + fifth.suffix) : "";
    const allDataText = [firstDataText, secondDataText, thirdDataText, fourthDataText, fifthDataText].filter(Boolean).join(nameSeparator).trim();

    // Only mentions and reactions popouts should patch in the gradient glow or else a double glow will appear on messages.
    const hoveringClass = (isHovering ? " show-me-your-name-gradient-hovered" : "");
    const gradientClasses = useTopRoleStyle
        ? "show-me-your-name-gradient show-me-your-name-gradient-inherit-bg" + hoveringClass
        : "show-me-your-name-gradient show-me-your-name-gradient-unset-bg" + hoveringClass;

    const firstGroupClasses = "show-me-your-name-name-group show-me-your-name-first-name-group";
    const secondGroupClasses = "show-me-your-name-name-group show-me-your-name-second-name-group";
    const thirdGroupClasses = "show-me-your-name-name-group show-me-your-name-third-name-group";
    const fourthGroupClasses = "show-me-your-name-name-group show-me-your-name-fourth-name-group";
    const fifthGroupClasses = "show-me-your-name-name-group show-me-your-name-fifth-name-group";
    const firstNameClasses = "show-me-your-name-name show-me-your-name-first-name";
    const secondNameClasses = "show-me-your-name-name show-me-your-name-second-name";
    const thirdNameClasses = "show-me-your-name-name show-me-your-name-third-name";
    const fourthNameClasses = "show-me-your-name-name show-me-your-name-fourth-name";
    const fifthNameClasses = "show-me-your-name-name show-me-your-name-fifth-name";
    const prefixClasses = "show-me-your-name-affix show-me-your-name-prefix";
    const suffixClasses = "show-me-your-name-affix show-me-your-name-suffix";

    const topLevelStyle = {
        // Allows names to wrap in reaction popouts.
        ...(isReactionsPopout
            ? { display: "flex", flexWrap: "wrap", lineHeight: "1.1em", fontSize: "0.9em" }
            : {}),
    } as React.CSSProperties;

    const nameElement = (
        <span style={topLevelStyle} className="show-me-your-name-container">
            {mentionSymbol && <span>{mentionSymbol}</span>}
            {(
                <span
                    className={(shouldGradientGlow ? (gradientClasses + " " + firstGroupClasses) : firstGroupClasses)}
                    data-text={shouldGradientGlow ? firstDataText : undefined}
                    style={(shouldGradientGlow && useTopRoleStyle && topRoleStyle ? topRoleStyle.gradient.animated : undefined) as React.CSSProperties}
                >
                    <span
                        className={firstNameClasses}
                        style={
                            topRoleStyle ?
                                shouldAnimateGradients && topRoleStyle.gradient
                                    ? topRoleStyle.gradient.animated
                                    : topRoleStyle.gradient
                                        ? topRoleStyle.gradient.static.original
                                        : topRoleStyle.normal.original
                                : undefined
                        }>
                        {first.wrapped}</span>
                </span>
            )}
            {[
                { name: second, dataText: secondDataText, groupClass: secondGroupClasses, nameClass: secondNameClasses, position: "second" },
                { name: third, dataText: thirdDataText, groupClass: thirdGroupClasses, nameClass: thirdNameClasses, position: "third" },
                { name: fourth, dataText: fourthDataText, groupClass: fourthGroupClasses, nameClass: fourthNameClasses, position: "fourth" },
                { name: fifth, dataText: fifthDataText, groupClass: fifthGroupClasses, nameClass: fifthNameClasses, position: "fifth" }
            ].map(({ name, dataText, groupClass, nameClass, position }) => name && (
                <span
                    key={position}
                    className={(shouldGradientGlow && shouldAnimateSecondaryNames ? (gradientClasses + " " + groupClass) : groupClass)}
                    data-text={shouldGradientGlow && dataText ? dataText : undefined}
                    style={(shouldGradientGlow && shouldAnimateSecondaryNames ? name.style.gradient.animated : undefined) as React.CSSProperties}
                >
                    <span style={affixColor as React.CSSProperties} className={prefixClasses}>
                        <span>{nameSeparator}</span>
                        {name.prefix}</span>
                    <span
                        // On non-primary names, allow disabling the gradients completely, or just their animation & glow.
                        className={nameClass}
                        style={{
                            ...(ignoreFonts ? { "font-family": "var(--font-primary)", "letter-spacing": "normal" } : {}),
                            ...(ignoreGradients
                                ? name.style.normal.adjusted
                                : shouldAnimateGradients && shouldAnimateSecondaryNames && name.style.gradient
                                    ? name.style.gradient.animated
                                    : name.style.gradient
                                        ? name.style.gradient.static.original
                                        : name.style.normal.adjusted)
                        }}>
                        {name.wrapped}</span>
                    <span style={affixColor as React.CSSProperties} className={suffixClasses}>
                        {name.suffix}</span>
                </span>
            ))}
        </span>
    );

    return [allDataText, nameElement, first.name];
}

const hoveringMessageMap = new Map<string, number>();
const hoveringReactionPopoutSet = new Set<string>();

function handleHoveringMessage(message: any, isHovering: boolean) {
    const messageId = message?.id;
    const groupId = message?.showMeYourNameGroupId ?? "";

    useEffect(() => {
        if (!message) return;

        if (isHovering) {
            addHoveringMessage(messageId);
            addHoveringMessage(groupId);
        } else {
            removeHoveringMessage(messageId);
            removeHoveringMessage(groupId);
        }
    }, [messageId, groupId, isHovering]);
}

function addHoveringMessage(id: string) {
    if (!id) return;

    const currentCount = hoveringMessageMap.get(id) || 0;
    hoveringMessageMap.set(id, currentCount + 1);

    if (currentCount === 0) {
        settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
    }
}

function removeHoveringMessage(id: string) {
    if (!id) return;

    const currentCount = hoveringMessageMap.get(id) || 0;

    if (currentCount <= 1) {
        hoveringMessageMap.delete(id);
        settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
    } else {
        hoveringMessageMap.set(id, currentCount - 1);
    }
}

function addHoveringReactionPopout(id: string) {
    hoveringReactionPopoutSet.add(id);
    settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
}

function removeHoveringReactionPopout(id: string) {
    hoveringReactionPopoutSet.delete(id);
    settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
}

function CustomNicknameModal({ modalProps, user }: { modalProps: ModalProps; user: User; }) {
    const [value, setValue] = useState(customNicknames[user.id] ?? "");

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Heading tag="h1" style={{ flexGrow: 1, margin: 0 }}>
                    {customNicknames[user.id] ? "Change SMYN Nickname" : "Add SMYN Nickname"}
                </Heading>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "16px", fontWeight: "400", lineHeight: "1.25", color: "var(--text-subtle)" }}>
                    {"Set a custom SMYN nickname for this user. Make use of it by specifying {custom} in the SMYN template settings."}
                </Heading>
                <div style={{ paddingTop: "10px", flexGrow: 0 }}></div>
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    SMYN Nickname
                </Heading>
                <TextInput
                    value={value}
                    maxLength={32}
                    onChange={setValue}
                    placeholder={user.globalName ?? user.username}
                    style={{ width: "100%" }}
                />
                <TextButton
                    className="show-me-your-name-reset-button"
                    onClick={async () => {
                        setValue("");
                        delete customNicknames[user.id];
                        await DataStore.set("SMYNCustomNicknames", customNicknames);
                        settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
                    }}
                >
                    Reset SMYN Nickname
                </TextButton>
                <div style={{ paddingTop: "10px", flexGrow: 0 }}></div>
            </ModalContent>
            <ModalFooter className="show-me-your-name-modal-footer-container">
                <Button
                    variant="primary"
                    onClick={async () => {
                        const trimmed = value.trim().slice(0, 32).trim();

                        if (trimmed) {
                            customNicknames[user.id] = trimmed;
                        } else {
                            delete customNicknames[user.id];
                        }

                        await DataStore.set("SMYNCustomNicknames", customNicknames);
                        settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
                        modalProps.onClose();
                    }}
                >
                    Save
                </Button>
                <Button
                    variant="secondary"
                    style={{ marginRight: "8px" }}
                    onClick={modalProps.onClose}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user) return;

    const currentUser = UserStore.getCurrentUser();
    if (!currentUser || user.id === currentUser.id) return;

    const group = findGroupChildrenByChildId("user-profile", children);

    !group && children.push(<Menu.MenuSeparator />);
    (group || children).push(
        <Menu.MenuItem
            id="smyn-custom-nickname"
            label={customNicknames[user.id] ? "Change SMYN Nickname" : "Add SMYN Nickname"}
            action={() => openModal(props => (
                <ErrorBoundary>
                    <CustomNicknameModal modalProps={props} user={user} />
                </ErrorBoundary>
            ))}
        />
    );
};

const settings = definePluginSettings({
    messages: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Display custom name format in messages.",
    },
    replies: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Display custom name format in replies.",
    },
    mentions: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Display custom name format in mentions.",
    },
    memberList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Display the first available name listed in your custom name format in the member list.",
    },
    profilePopout: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Display the first available name listed in your custom name format in profile popouts.",
    },
    voiceChannels: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Display the first available name listed in your custom name format in voice channels.",
    },
    reactions: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Display the first available name listed in your custom name format in reaction tooltips, and the full name in reaction popouts.",
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
    truncateAllNamesWithStreamerMode: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Truncate all names, not just usernames, while in Streamer Mode.",
    },
    removeDuplicates: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "If any of the names are equivalent, remove them, leaving only the unique names.",
    },
    ignoreFonts: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "For the non-primary names, use Discord's default fonts regardless of the user's custom nitro font.",
    },
    ignoreGradients: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "For the non-primary names, if the role has a gradient, ignore it in favor of the color set below.",
    },
    animateGradients: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "For the non-primary names, if the role has a gradient, animate it. This is disabled by \"Ignore Gradients\" and reduced motion.",
    },
    nameSeparator: {
        type: OptionType.STRING,
        description: "The separator to use between names. The default is a single space.",
        default: " ",
    },
    includedNames: {
        type: OptionType.STRING,
        description: "The order to display usernames, display names, nicknames, friend names, and custom names. Use the following placeholders: {user}, {display}, {nick}, {friend}, {custom}. You can provide multiple name options to use as fallbacks if one is unavailable by separating them with commas as such: {custom, friend, nick}. You can have up to three prefixes and three suffixes per name.",
        default: "{custom, friend, nick} [{display}] (@{user})",
        isValid: validTemplate,
    },
    customNameColor: {
        type: OptionType.STRING,
        description: "The color to use for the custom name you assigned a user if it's not the first displayed. Leave blank for default. Accepts hex(a), rgb(a), or hsl(a) input. Use \"Role\" to follow the user's top role color. Use \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
        isValid: validColor,
    },
    friendNameColor: {
        type: OptionType.STRING,
        description: "The color to use for a friend's nickname if it's not the first displayed. Leave blank for default. Accepts hex(a), rgb(a), or hsl(a) input. Use \"Role\" to follow the user's top role color. Use \"Role+-#\" to adjust the brightness by that percentage (ex: \"Role+15\")",
        default: "Role-25",
        isValid: validColor,
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
    },
    triggerNameRerender: {
        type: OptionType.BOOLEAN,
        description: "Trigger a name rerender by toggling this setting.",
        default: false,
        hidden: true
    },
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display any permutation of custom nicknames, friend nicknames, server nicknames, display names, and usernames in chat.",
    authors: [Devs.Rini, Devs.TheKodeToad, EquicordDevs.Etorix, Devs.sadan, EquicordDevs.Prism],
    tags: ["SMYN", "Nicknames", "Custom Nicknames",],
    isModified: true,
    settings,

    patches: [
        {
            find: '="SYSTEM_TAG"',
            group: true,
            replacement: [
                {
                    // Replace names in messages and replies.
                    match: /(onContextMenu:\i,children:)(.{0,250}?),"data-text":(\i\+\i)/,
                    replace: "$1$self.getMessageNameElement(arguments[0])??($2),\"data-text\":$self.getMessageNameText(arguments[0])??($3)"
                },
                {
                    // Pass the message object to the should-animate checker.
                    match: /(\(\{)(shouldSubscribe)/,
                    replace: "$1message:arguments[0].message,$2"
                }
            ]
        },
        {
            // Track hovering on messages to animate gradients.
            // Attach the group ID to their messages to allow animating gradients within a group.
            find: "CUSTOM_GIFT?\"\":",
            replacement: {
                match: /(\(\i,\i,\i\);)(let \i=\i.id===\i(?:.{0,500}?)hovering:(\i))/,
                replace: "$1arguments[0].message.showMeYourNameGroupId=!!arguments[0].groupId?`g-${arguments[0].groupId}`:null;$self.handleHoveringMessage(arguments[0].message,$3);$2"
            },
        },
        {
            // Replace names in mentions.
            find: ".USER_MENTION)",
            replacement: [
                {
                    match: /(let \i=\i=>\(0,)/,
                    replace: "const showMeYourNameMention=$self.getMentionNameElement(arguments[0]);$1"
                },
                {
                    match: /(?<=onContextMenu:\i\},\i\),{children:)/,
                    replace: "showMeYourNameMention??",
                    predicate: () => !isPluginEnabled(mentionAvatars.name),
                }
            ]
        },
        {
            // Pass on the props to the mention renderer so that hovering second-level
            // message mentions can accurately be tracked based on props.messageId
            find: "noStyleAndInteraction},",
            replacement: {
                match: /(className:"mention",)/,
                replace: "$1props:arguments[2],"
            }
        },
        {
            // Replace names in the member list.
            find: "let{colorRoleName:",
            replacement: {
                match: /(let{colorRoleName:\i,colorString:\i,colorStrings:\i,)name:(\i)/,
                replace: "$1showMeYourNameName:$2=$self.getMemberListProfilesReactionsVoiceNameText({...arguments[0],type:\"membersList\"})??(arguments[0].name)"
            }
        },
        {
            // Replace names in profile popouts.
            find: "clickableUsername,\"aria-label\":",
            replacement: {
                match: /(tags:\i,)nickname:(\i)/,
                replace: "$1showMeYourNameNickname:$2=$self.getMemberListProfilesReactionsVoiceNameText({...arguments[0],type:\"profilesPopout\"})??(arguments[0].nickname)"
            },
        },
        {
            // Tags *should* contain the guild ID nested in its structure, but on the first time
            // loading a guild member's preview profile, it will be undefined. This patch bypasses
            // that by passing the guild ID as its own prop.
            find: "\"UserProfilePopoutBody\"}",
            replacement: {
                match: /(pronouns,tags:)/,
                replace: "pronouns,guildId:arguments[0]?.guild?.id??null,tags:"
            }
        },
        {
            // Same as above, but for bot members.
            find: "popularApplicationCommandIds)!=null&&null",
            replacement: {
                match: /(pronouns,tags:)/,
                replace: "pronouns,guildId:arguments[0]?.guild?.id??null,tags:"
            }
        },
        {
            // Replace names in the profile tooltip for switching between guild and global profiles.
            // You must open a profile modal before the code this is patching will be searchable.
            find: "\"view-main-profile\",",
            group: true,
            replacement: [
                {
                    match: /(displayName:)(\i.\i.getName\(void 0,void 0,\i\))/,
                    replace: "$1$self.getMemberListProfilesReactionsVoiceNameText({user:arguments[0].user,guildId:null,type:\"profilesTooltip\"})??($2)"
                },
                {
                    match: /(displayName:)(\i.\i.getName\(\i,\i,\i\))/,
                    replace: "$1$self.getMemberListProfilesReactionsVoiceNameText({user:arguments[0].user,guildId:arguments[0].guildId,type:\"profilesTooltip\"})??($2)"
                }
            ]
        },
        {
            // Replace names in reaction tooltips.
            find: "reactionTooltip1,",
            replacement: {
                match: /(\i.\i.getName\((\i),null==(?:.{0,15}?)(\i)\))/,
                replace: "$self.getMemberListProfilesReactionsVoiceNameText({user:$3,guildId:$2,type:\"reactionsTooltip\"})??($1)"
            }
        },
        {
            find: "discriminator,forceUsername",
            group: true,
            replacement: [
                {
                    // Replace names in reaction popouts.
                    match: /children:(\[null!=(?:.{0,300}?)forceUsername:!0}\)\])/,
                    replace: "style:{\"overflow\":\"visible\"},children:($self.getMemberListProfilesReactionsVoiceNameElement({user:arguments[0].user,guildId:arguments[0].guildId,type:\"reactionsPopout\"}))??($1)"
                },
                {
                    // Track hovering over reaction popouts.
                    match: /(return\(0,\i.\i\)\(\i.\i,{className:\i.reactor,)(onContextMenu)/,
                    replace: "$1onMouseEnter:()=>{$self.addHoveringReactionPopout(arguments[0].user.id)},onMouseLeave:()=>{$self.removeHoveringReactionPopout(arguments[0].user.id)},$2"
                }
            ]
        },
        {
            // Replace names in voice channels.
            find: ",connectUserDragSource:",
            replacement: {
                match: /(serverDeaf:\i,)nick:(\i)/,
                replace: "$1showMeYourNameVoice:$2=$self.getMemberListProfilesReactionsVoiceNameText({user:arguments[0].user,guildId:arguments[0].channel.guild_id,type:\"voiceChannel\"})??(arguments[0].nick)"
            }
        }
    ],

    async start() {
        const data = await DataStore.get<CustomNicknameData>("SMYNCustomNicknames");
        customNicknames = data ?? {};
    },

    contextMenus: {
        "user-context": userContextPatch
    },

    flux: {
        RELATIONSHIP_UPDATE(data) {
            // Allows rerendering when changing friend names.
            settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
        },

        RUNNING_STREAMER_TOOLS_CHANGE(data) {
            // Allows rerendering when toggling streamer mode.
            settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
        },

        ACCESSIBILITY_SYSTEM_PREFERS_REDUCED_MOTION_CHANGED(data) {
            // Allows rerendering when toggling reduced motion.
            settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
        },

        ACCESSIBILITY_SET_PREFERS_REDUCED_MOTION(data) {
            // Allows rerendering when toggling reduced motion.
            settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
        }
    },

    addHoveringMessage,
    removeHoveringMessage,
    handleHoveringMessage,
    addHoveringReactionPopout,
    removeHoveringReactionPopout,
    getMessageNameText,
    getMessageNameElement,
    getMentionNameElement,
    getMemberListProfilesReactionsVoiceNameText,
    getMemberListProfilesReactionsVoiceNameElement
});
