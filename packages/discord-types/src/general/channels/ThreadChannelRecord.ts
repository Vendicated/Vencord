/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish, OmitOptional, Optional, PartialOnUndefined } from "../../internal";
import type { ChannelRecordBase, ChannelRecordOwnProperties, ChannelType } from "./ChannelRecord";

export type ThreadChannelProperties = Optional<PartialOnUndefined<OmitOptional<ChannelRecordOwnProperties<ThreadChannelRecord>>>, Nullish, "appliedTags" | "guild_id" | "name">;

type ThreadChannelType = ChannelType.ANNOUNCEMENT_THREAD | ChannelType.PUBLIC_THREAD | ChannelType.PRIVATE_THREAD;

export declare class ThreadChannelRecord<ChannelType extends ThreadChannelType = ThreadChannelType> extends ChannelRecordBase {
    constructor(channelProperties: ThreadChannelProperties);

    static fromServer<Type extends ThreadChannelType | Nullish = undefined>(
        /** @todo */
        channelFromServer: { type?: Type; } & Record<string, any>,
        guildId?: string | null
    ): ThreadChannelRecord<Type extends ThreadChannelType ? Type : ChannelType.PUBLIC_THREAD>;

    application_id?: undefined;
    appliedTags: Defined<ChannelRecordBase["appliedTags"]>;
    availableTags?: undefined;
    bitrate_: undefined;
    blockedUserWarningDismissed?: undefined;
    defaultAutoArchiveDuration?: undefined;
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
    defaultThreadRateLimitPerUser?: undefined;
    flags_: Defined<ChannelRecordBase["flags_"]>;
    icon?: undefined;
    iconEmoji?: undefined;
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    linkedLobby?: undefined;
    member: ChannelRecordBase["member"];
    memberCount: Defined<ChannelRecordBase["memberCount"]>;
    memberIdsPreview: Defined<ChannelRecordBase["memberIdsPreview"]>;
    memberListId?: undefined;
    messageCount: Defined<ChannelRecordBase["messageCount"]>;
    nicks?: undefined;
    nsfw_: Defined<ChannelRecordBase["nsfw_"]>;
    originChannelId?: undefined;
    ownerId: Defined<ChannelRecordBase["ownerId"]>;
    parent_id: NonNullable<ChannelRecordBase["parent_id"]>;
    parentChannelThreadType: Defined<ChannelRecordBase["parentChannelThreadType"]>;
    permissionOverwrites_?: undefined;
    position_?: undefined;
    rateLimitPerUser_: Defined<ChannelRecordBase["rateLimitPerUser_"]>;
    rawRecipients?: undefined;
    recipientFlags?: undefined;
    recipients?: undefined;
    rtcRegion: undefined;
    safetyWarnings?: undefined;
    template?: undefined;
    themeColor?: undefined;
    threadMetadata: ChannelRecordBase["threadMetadata"];
    topic_?: undefined;
    totalMessageSent: ChannelRecordBase["rateLimitPerUser_"];
    type: ChannelType;
    userLimit_: undefined;
    version?: undefined;
    videoQualityMode: undefined;
}
