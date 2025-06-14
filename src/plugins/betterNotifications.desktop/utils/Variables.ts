/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { GuildStore } from "@webpack/common";

import { settings } from "..";
import { AdvancedNotification } from "../types/advancedNotification";
import { BasicNotification } from "../types/basicNotification";

const logger = new Logger("BetterNotifications");

export const Replacements = [
    "username",
    "nickname",
    "body",
    "channelId",
    "channelName",
    "groupName",
    "guildName",
    "guildDescription",
    "guildTag"
] as const;

const platform = navigator.platform.toLowerCase();
export const isWin = platform.startsWith("win");
export const isMac = platform.startsWith("mac");
export const isLinux = platform.startsWith("linux");

type ReplacementMap = {
    [k in typeof Replacements[number]]: string
};

interface GuildInfo {
    name: string;
    description: string;
}

interface ChannelInfo {
    channel: string; // Channel name
    groupName: string;
}


function getChannelInfoFromTitle(title: string, basicNotification: BasicNotification, advancedNotification: AdvancedNotification): ChannelInfo {
    let channelInfo: ChannelInfo;
    try {
        const parts = title.split(" (#");
        if (parts === undefined) {
            channelInfo = {
                channel: "unknown",
                groupName: "unknown"
            };
        }
        const innerInfo = parts[1];
        const data = innerInfo.slice(0, -1).split(", ");
        channelInfo = {
            channel: data[0],
            groupName: data[1]
        };
    } catch (error) {
        console.error(error);
        channelInfo = {
            channel: "unknown",
            groupName: "unknown"
        };
    }

    return channelInfo;
}

export function replaceVariables(advancedNotification: AdvancedNotification, basicNotification: BasicNotification, title: string, body: string, texts: string[]): string[] {
    let guildInfo: GuildInfo;
    let channelInfo: ChannelInfo;

    if (basicNotification.channel_type === 1) { // DM
        channelInfo = {
            channel: settings.store.notificationDmChannelname,
            groupName: advancedNotification.messageRecord.author.globalName ?? settings.store.userPrefix + advancedNotification.messageRecord.author.username
        };
        guildInfo = {
            name: settings.store.notificationDmGuildname,
            description: ""
        };
    } else {
        const channelData = getChannelInfoFromTitle(title, basicNotification, advancedNotification);
        const guildData = GuildStore.getGuild(basicNotification.guild_id);

        channelInfo = {
            channel: settings.store.channelPrefix + channelData.channel,
            groupName: channelData.groupName
        };
        guildInfo = {
            name: guildData.name,
            description: guildData.description ?? ""
        };
    }

    const replacementMap: ReplacementMap = {
        username: settings.store.userPrefix + advancedNotification.messageRecord.author.username,
        body,
        channelName: channelInfo.channel,
        channelId: advancedNotification.messageRecord.channel_id,
        groupName: channelInfo.groupName,
        nickname: advancedNotification.messageRecord.author.globalName ?? advancedNotification.messageRecord.author.username,
        guildName: guildInfo.name,
        guildDescription: guildInfo.description,
        guildTag: advancedNotification.messageRecord.author.primaryGuild?.tag ?? ""
    };

    new Map(Object.entries(replacementMap)).forEach((value, key) => {
        logger.debug(`Replacing ${key} - ${value}`);
        texts = texts.map(text => text.replaceAll(`{${key}}`, value));
    });

    return texts;
}

/** @deprecated findByProps("htmlFor").defaultHtmlOutput(SimpleMarkdown.defaultInlineParse(input: string)); is a better alternative. (thanks @suffocate on discord)  */
export function createMarkupForLinux(notificationBody: string, basicNotification: BasicNotification): string {
    // @ts-ignore
    const parser: ParserType = Parser;

    const res = parser.parseToAST(notificationBody, true, {
        channelId: basicNotification.channel_id,
        messageId: basicNotification.message_id,
        allowLinks: true,
        allowDevLinks: true,
        allowHeading: false,
        allowList: false,
        allowEmojiLinks: true,
        previewLinkTarget: true,
        viewingChannelId: basicNotification.channel_id,
    });

    let linuxString: string = "";


    for (const item of res) {
        console.debug(item);
        switch (item.type) {
            case "text":
                linuxString += safeStringForXML(item.content);
                break;

            case "em":
                for (const text of item.content) {
                    if (text.type !== "text") continue;
                    linuxString += `<i>${safeStringForXML(text.content)}</i>`;
                }
                break;

            case "strong":
                for (const text of item.content) {
                    if (text.type !== "text") continue;
                    linuxString += `<b>${safeStringForXML(text.content)}</b>`;
                }
                break;

            case "link":
                for (const text of item.content) {
                    if (text.type !== "text") continue;
                    linuxString += `<a href="${item.target}">${safeStringForXML(text.content)} </a>`;
                }
                break;

            case "subtext":
                for (const text of item.content) {
                    if (text.type !== "text") continue;
                    linuxString += safeStringForXML(text.content);
                }
                break;

            case "emoji":
                linuxString += item.surrogate;
                break;
        }
    }

    logger.debug("Generated the following linux notification string");
    logger.debug(linuxString);
    return linuxString;
}


export function safeStringForXML(input: string): string {
    return input
        .replace(/&/g, "&amp;") // Must be first to avoid double-escaping
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

