/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish, OmitOptional, Optional, PartialOnUndefined } from "../../internal";
import type { ChannelBaseProperties, ChannelRecordBase, ChannelRecordOwnProperties, ChannelType } from "./ChannelRecord";

export type ForumChannelRecord = GuildForumChannelRecord | GuildMediaChannelRecord;

// @ts-expect-error: TS bug
export type ForumChannelProperties<Channel extends ForumChannelRecordBase> = ChannelBaseProperties & Optional<PartialOnUndefined<OmitOptional<ChannelRecordOwnProperties<Channel>>>, Nullish, "availableTags" | "permissionOverwrites_">;

type ForumChannelType = ChannelType.GUILD_FORUM | ChannelType.GUILD_MEDIA;

export declare abstract class ForumChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: ForumChannelProperties<ForumChannelRecordBase>);

    static fromServer<Type extends ForumChannelType>(
        /** @todo */
        channelFromServer: { type: Type; } & Record<string, any>,
        guildId?: string | Nullish
    ): {
        [ChannelType.GUILD_FORUM]: GuildForumChannelRecord;
        [ChannelType.GUILD_MEDIA]: GuildMediaChannelRecord;
    }[Type];

    application_id?: undefined;
    appliedTags?: undefined;
    availableTags: Defined<ChannelRecordBase["availableTags"]>;
    bitrate_?: undefined;
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
    type: ForumChannelType;
    userLimit_?: undefined;
    version: ChannelRecordBase["version"];
    videoQualityMode?: undefined;
    voiceBackgroundDisplay?: undefined;
}

export declare class GuildForumChannelRecord extends ForumChannelRecordBase {
    constructor(channelProperties: ForumChannelProperties<GuildForumChannelRecord>);

    type: ChannelType.GUILD_FORUM;
}

export declare class GuildMediaChannelRecord extends ForumChannelRecordBase {
    constructor(channelProperties: ForumChannelProperties<GuildMediaChannelRecord>);

    type: ChannelType.GUILD_MEDIA;
}
