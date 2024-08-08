/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish, OmitOptional, Optional, PartialOnUndefined } from "../../internal";
import type { ChannelRecordBase, ChannelRecordOwnProperties, ChannelType } from "./ChannelRecord";

export type ForumChannelProperties = Optional<PartialOnUndefined<OmitOptional<ChannelRecordOwnProperties<ForumChannelRecord>>>, Nullish, "availableTags" | "guild_id" | "name" | "permissionOverwrites_">;

type ForumChannelType = ChannelType.GUILD_FORUM | ChannelType.GUILD_MEDIA;

export declare class ForumChannelRecord<ChannelType extends ForumChannelType = ForumChannelType> extends ChannelRecordBase {
    constructor(channelProperties: ForumChannelProperties);

    static fromServer<Type extends ForumChannelType>(
        /** @todo */
        channelFromServer: { type: Type; } & Record<string, any>,
        guildId?: string | Nullish
    ): ForumChannelRecord<Type>;

    application_id?: undefined;
    appliedTags?: undefined;
    availableTags: Defined<ChannelRecordBase["availableTags"]>;
    bitrate_?: undefined;
    blockedUserWarningDismissed?: undefined;
    defaultAutoArchiveDuration: ChannelRecordBase["defaultAutoArchiveDuration"];
    defaultForumLayout: ChannelRecordBase["defaultForumLayout"];
    defaultReactionEmoji: ChannelRecordBase["defaultReactionEmoji"];
    defaultSortOrder: ChannelRecordBase["defaultSortOrder"];
    defaultThreadRateLimitPerUser: ChannelRecordBase["defaultThreadRateLimitPerUser"];
    flags_: Defined<ChannelRecordBase["flags_"]>;
    icon?: undefined;
    iconEmoji: ChannelRecordBase["iconEmoji"];
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastPinTimestamp"];
    linkedLobby?: undefined;
    member?: undefined;
    memberCount?: undefined;
    memberIdsPreview?: undefined;
    /** @todo May only be nullish. */
    memberListId: ChannelRecordBase["memberListId"];
    messageCount?: undefined;
    nicks?: undefined;
    nsfw_: Defined<ChannelRecordBase["nsfw_"]>;
    originChannelId?: undefined;
    ownerId?: undefined;
    parent_id: NonNullable<ChannelRecordBase["parent_id"]>;
    parentChannelThreadType?: undefined;
    permissionOverwrites_: Defined<ChannelRecordBase["permissionOverwrites_"]>;
    position_: Defined<ChannelRecordBase["position_"]>;
    rateLimitPerUser_: Defined<ChannelRecordBase["rateLimitPerUser_"]>;
    rawRecipients?: undefined;
    recipients?: undefined;
    rtcRegion?: undefined;
    safetyWarnings?: undefined;
    template: Defined<ChannelRecordBase["template"]>;
    themeColor: ChannelRecordBase["themeColor"];
    threadMetadata?: undefined;
    topic_: ChannelRecordBase["topic_"];
    totalMessageSent?: undefined;
    type: ChannelType;
    userLimit_?: undefined;
    version: ChannelRecordBase["version"];
    videoQualityMode?: undefined;
    voiceBackgroundDisplay?: undefined;
}
