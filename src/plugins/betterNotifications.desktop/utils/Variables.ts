/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type AdvancedNotification } from "@plugins/betterNotifications.desktop/types/advancedNotification";
import { type BasicNotification } from "@plugins/betterNotifications.desktop/types/basicNotification";
import { Logger } from "@utils/Logger";
import { GuildStore } from "@webpack/common";

import { settings } from "..";

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

type Variables = {
    [k in typeof Replacements[number]]: (notification: AdvancedNotification) => boolean;
} & {
    [k in `"${string}"`]: (notification: AdvancedNotification) => boolean
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

export function parseVariables(format: string, notification: AdvancedNotification): [string, Partial<Variables>] {
    logger.info("Parsing variables");
    const variableRegex = /(?<=\[).+?(?=])/g;

    const matches = [...format.matchAll(variableRegex)];
    const variables: Partial<Variables> = {};

    logger.info(`Variable matches: ${matches.length}`);

    for (const match of matches) {
        const statements: string[] = [];

        let quotesOpen = false;
        let tempString = "";

        for (const char of match[0]) {
            if (char === '"') {
                if (quotesOpen) {
                    statements.push(`"${tempString.replaceAll(" ", "(/space/)")}"`);
                    tempString = "";
                }

                quotesOpen = !quotesOpen;
                continue;
            }

            if (char === " " && !quotesOpen && tempString.length > 0) {
                statements.push(tempString.trim());
                tempString = "";
                continue;
            }

            tempString += char;
        }

        if (tempString.length !== 0) {
            statements.push(tempString.trim());
        }


        const resultVariable = statements[0];

        logger.info(statements);

        if (statements[1] !== "if") {
            logger.warn("Statement not in expected format! (variable if x y z)");
            continue;
        }

        const comparisonValue = statements[2];
        const comparison = statements[3] || "is";
        const comparedValue = statements[4] || "true";

        const validVariables: string[] = Array.from([...Replacements]);
        const validComparisons = Object.keys(notification.messageRecord);

        if ((!resultVariable.startsWith('"') && !validVariables.includes(resultVariable)) || !validComparisons.includes(comparisonValue)) {
            logger.warn(`Variable ${resultVariable} or ${comparisonValue} doesn't exist!`);
            logger.debug("Allowed resulting variables: ");
            logger.debug(validVariables);
            logger.debug("Allowed comparison variables: ");
            logger.debug(validComparisons);
            continue;
        }

        switch (comparison) {
            case "==":
            case "is":
                variables[resultVariable] = (notification: AdvancedNotification) => { return String(notification.messageRecord[comparisonValue]) === comparedValue; };
                break;

            case "!=":
            case "isnot":
                variables[resultVariable] = (notification: AdvancedNotification) => { return String(notification.messageRecord[comparisonValue]) !== comparedValue; };
                break;
        }
        logger.info(`Succesfully generated variable for statement ${match[0]}`);
        format = format.replace(match[0], `${resultVariable}?`);
    }

    logger.info("Done parsing variables");
    return [format, variables];
}

export function replaceVariables(advancedNotification: AdvancedNotification, basicNotification: BasicNotification, title: string, body: string, texts: string[], variables: Partial<Variables> = {}): string[] {
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

    Object.keys(variables).map(index => {
        logger.info(`Checking statement for variable ${index}...`);
        const variable: (notification: AdvancedNotification) => boolean = variables[index];

        logger.info("Checking function: ");
        console.log(variable);

        const conditionTrue = variable(advancedNotification);
        if (conditionTrue) {
            logger.info("Matches!");

            if (index.startsWith('"')) {
                texts = texts.map(text => text.replaceAll(`[${index}?]`, index.slice(1, index.length - 1).replaceAll("(/space/)", " ")));
            } else {
                texts = texts.map(text => text.replaceAll(`[${index}?]`, replacementMap[index]));
            }
        } else {
            logger.info("Doesn't match");
            texts = texts.map(text => text.replaceAll(`[${index}?]`, ""));
        }
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

