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
    "guildDescription"
] as const;

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
        guildDescription: guildInfo.description
    };

    new Map(Object.entries(replacementMap)).forEach((value, key) => {
        logger.debug(`Replacing ${key} - ${value}`);
        texts = texts.map(text => text.replaceAll(`{${key}}`, value));
    });

    texts.push(channelInfo.channel);
    return texts;
}
