/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish } from "../../internal";
import type { ChannelRecordBase, ChannelType } from "./ChannelRecord";

type ThreadChannelType = ChannelType.ANNOUNCEMENT_THREAD | ChannelType.PUBLIC_THREAD | ChannelType.PRIVATE_THREAD;

export class ThreadChannelRecord<ChannelType extends ThreadChannelType = ThreadChannelType> extends ChannelRecordBase {
    /** @todo */
    constructor(channelProperties: Record<string, any>);

    /** @todo */
    static fromServer(channelFromServer: Record<string, any>, guildId?: string | Nullish): ThreadChannelRecord;

    application_id?: undefined;
    appliedTags: Defined<ChannelRecordBase["appliedTags"]>;
    availableTags?: undefined;
    bitrate_: undefined;
    defaultAutoArchiveDuration?: undefined;
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
    defaultThreadRateLimitPerUser?: undefined;
    icon?: undefined;
    iconEmoji?: undefined;
    isMessageRequest?: undefined;
    isMessageRequestTimestamp?: undefined;
    isSpam?: undefined;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastMessageId"];
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
    voiceBackgroundDisplay?: undefined;
}
