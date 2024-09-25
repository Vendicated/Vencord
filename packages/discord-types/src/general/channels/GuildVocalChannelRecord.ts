/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish, OmitOptional, Optional, PartialOnUndefined } from "../../internal";
import type { ChannelRecordBase, ChannelRecordOwnProperties, ChannelType } from "./ChannelRecord";

export type GuildVocalChannelRecord = GuildVoiceChannelRecord | GuildStageVoiceChannelRecord;

export type GuildVocalChannelProperties = Optional<PartialOnUndefined<OmitOptional<ChannelRecordOwnProperties<GuildVocalChannelRecordBase>>>, Nullish, "guild_id" | "name" | "permissionOverwrites_">;

type GuildVocalChannelType = ChannelType.GUILD_VOICE | ChannelType.GUILD_STAGE_VOICE;

export declare abstract class GuildVocalChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: GuildVocalChannelProperties);

    static fromServer<Type extends GuildVocalChannelType | Nullish = undefined>(
        /** @todo */
        channelFromServer: { type?: Type; } & Record<string, any>,
        guildId?: string | null
    ): {
        [ChannelType.GUILD_STAGE_VOICE]: GuildStageVoiceChannelRecord;
        [ChannelType.GUILD_VOICE]: GuildVoiceChannelRecord;
    }[Type extends GuildVocalChannelType ? Type : ChannelType.GUILD_VOICE];

    application_id: undefined;
    appliedTags?: undefined;
    availableTags?: undefined;
    bitrate_: Defined<ChannelRecordBase["bitrate_"]>;
    blockedUserWarningDismissed?: undefined;
    defaultAutoArchiveDuration?: undefined;
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
    defaultThreadRateLimitPerUser?: undefined;
    flags_: Defined<ChannelRecordBase["flags_"]>;
    icon?: undefined;
    iconEmoji: ChannelRecordBase["iconEmoji"];
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    lastPinTimestamp: undefined;
    linkedLobby?: undefined;
    member?: undefined;
    memberCount?: undefined;
    memberIdsPreview?: undefined;
    /** @todo May only be nullish. */
    memberListId: ChannelRecordBase["memberListId"];
    messageCount?: undefined;
    nicks?: undefined;
    nsfw_: Defined<ChannelRecordBase["nsfw_"]>;
    /** @todo May only be nullish. */
    originChannelId: ChannelRecordBase["originChannelId"];
    ownerId?: undefined;
    parent_id: ChannelRecordBase["parent_id"];
    parentChannelThreadType?: undefined;
    permissionOverwrites_: Defined<ChannelRecordBase["permissionOverwrites_"]>;
    position_: Defined<ChannelRecordBase["position_"]>;
    rateLimitPerUser_: Defined<ChannelRecordBase["rateLimitPerUser_"]>;
    rawRecipients?: undefined;
    recipientFlags?: undefined;
    recipients?: undefined;
    rtcRegion: Defined<ChannelRecordBase["rtcRegion"]>;
    safetyWarnings?: undefined;
    template?: undefined;
    themeColor: Nullish;
    threadMetadata?: undefined;
    topic_: Nullish;
    totalMessageSent?: undefined;
    type: GuildVocalChannelType;
    userLimit_: Defined<ChannelRecordBase["userLimit_"]>;
    version: ChannelRecordBase["version"];
    videoQualityMode: ChannelRecordBase["videoQualityMode"];
}

export type GuildVoiceChannelProperties = Optional<PartialOnUndefined<OmitOptional<ChannelRecordOwnProperties<GuildVoiceChannelRecord>>>, Nullish, "guild_id" | "name" | "permissionOverwrites_">;

export declare class GuildVoiceChannelRecord extends GuildVocalChannelRecordBase {
    constructor(channelProperties: GuildVoiceChannelProperties);

    type: ChannelType.GUILD_VOICE;
}

export type GuildStageVoiceChannelProperties = Optional<PartialOnUndefined<OmitOptional<ChannelRecordOwnProperties<GuildStageVoiceChannelRecord>>>, Nullish, "guild_id" | "name" | "permissionOverwrites_">;

export declare class GuildStageVoiceChannelRecord extends GuildVocalChannelRecordBase {
    constructor(channelProperties: GuildStageVoiceChannelProperties);

    type: ChannelType.GUILD_STAGE_VOICE;
}
