/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish, OmitOptional, Optional, PartialOnUndefined } from "../../internal";
import type { ChannelBaseProperties, ChannelRecordBase, ChannelRecordOwnProperties, ChannelType } from "./ChannelRecord";

export type GuildTextualChannelRecord = GuildTextChannelRecord | GuildCategoryChannelRecord | GuildAnnouncementChannelRecord | GuildStoreChannelRecord | GuildDirectoryChannelRecord;

// @ts-expect-error: TS bug
export type GuildTextualChannelProperties<Channel extends GuildTextualChannelRecordBase> = ChannelBaseProperties & Optional<PartialOnUndefined<OmitOptional<ChannelRecordOwnProperties<Channel>>>, Nullish, "permissionOverwrites_">;

type GuildTextualChannelType = ChannelType.GUILD_TEXT | ChannelType.GUILD_CATEGORY | ChannelType.GUILD_ANNOUNCEMENT | ChannelType.GUILD_STORE | ChannelType.GUILD_DIRECTORY;

export declare abstract class GuildTextualChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: GuildTextualChannelProperties<GuildTextualChannelRecordBase>);

    static fromServer<Type extends GuildTextualChannelType | Nullish = undefined>(
        /** @todo */
        channelFromServer: { type?: Type; } & Record<string, any>,
        guildId?: string | Nullish
    ): {
        [ChannelType.GUILD_ANNOUNCEMENT]: GuildAnnouncementChannelRecord;
        [ChannelType.GUILD_CATEGORY]: GuildCategoryChannelRecord;
        [ChannelType.GUILD_DIRECTORY]: GuildDirectoryChannelRecord;
        [ChannelType.GUILD_STORE]: GuildStoreChannelRecord;
        [ChannelType.GUILD_TEXT]: GuildTextChannelRecord;
    }[Type extends GuildTextualChannelType ? Type : ChannelType.GUILD_TEXT];

    application_id: undefined;
    appliedTags?: undefined;
    availableTags?: undefined;
    bitrate_?: undefined;
    defaultAutoArchiveDuration: ChannelRecordBase["defaultAutoArchiveDuration"];
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
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
    parent_id: ChannelRecordBase["parent_id"];
    parentChannelThreadType?: undefined;
    permissionOverwrites_: Defined<ChannelRecordBase["permissionOverwrites_"]>;
    position_: Defined<ChannelRecordBase["position_"]>;
    rateLimitPerUser_: Defined<ChannelRecordBase["rateLimitPerUser_"]>;
    rawRecipients?: undefined;
    recipients?: undefined;
    rtcRegion?: undefined;
    safetyWarnings?: undefined;
    template?: undefined;
    themeColor: ChannelRecordBase["themeColor"];
    threadMetadata?: undefined;
    topic_: ChannelRecordBase["topic_"];
    totalMessageSent?: undefined;
    type: GuildTextualChannelType;
    userLimit_?: undefined;
    version: ChannelRecordBase["version"];
    videoQualityMode?: undefined;
    voiceBackgroundDisplay?: undefined;
}

export declare class GuildTextChannelRecord extends GuildTextualChannelRecordBase {
    constructor(channelProperties: GuildTextualChannelProperties<GuildTextChannelRecord>);

    type: ChannelType.GUILD_TEXT;
}

export declare class GuildCategoryChannelRecord extends GuildTextualChannelRecordBase {
    constructor(channelProperties: GuildTextualChannelProperties<GuildCategoryChannelRecord>);

    defaultAutoArchiveDuration: undefined;
    defaultThreadRateLimitPerUser: undefined;
    lastMessageId: undefined;
    lastPinTimestamp: undefined;
    memberListId: undefined;
    parent_id: Nullish;
    themeColor: undefined;
    topic_: undefined;
    type: ChannelType.GUILD_CATEGORY;
}

export declare class GuildAnnouncementChannelRecord extends GuildTextualChannelRecordBase {
    constructor(channelProperties: GuildTextualChannelProperties<GuildAnnouncementChannelRecord>);

    type: ChannelType.GUILD_ANNOUNCEMENT;
}

export declare class GuildStoreChannelRecord extends GuildTextualChannelRecordBase {
    constructor(channelProperties: GuildTextualChannelProperties<GuildAnnouncementChannelRecord>);

    type: ChannelType.GUILD_STORE;
}

export declare class GuildDirectoryChannelRecord extends GuildTextualChannelRecordBase {
    constructor(channelProperties: GuildTextualChannelProperties<GuildDirectoryChannelRecord>);

    type: ChannelType.GUILD_DIRECTORY;
}
