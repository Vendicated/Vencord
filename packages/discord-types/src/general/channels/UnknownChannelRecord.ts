/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish } from "../../internal";
import type { ChannelRecordBase, ChannelRecordOwnProperties, ChannelType } from "./ChannelRecord";

export type UnknownChannelProperties = ChannelRecordOwnProperties<UnknownChannelRecord>;

export declare class UnknownChannelRecord extends ChannelRecordBase {
    constructor(channelProperties: UnknownChannelProperties);

    static fromServer(
        /** @todo */
        channelFromServer: { type?: ChannelType.UNKNOWN | Nullish; } & Record<string, any>,
        guildId?: string | Nullish
    ): UnknownChannelRecord;

    application_id: ChannelRecordBase["application_id"];
    appliedTags: ChannelRecordBase["appliedTags"];
    availableTags: ChannelRecordBase["availableTags"];
    bitrate_: ChannelRecordBase["bitrate_"];
    defaultAutoArchiveDuration: ChannelRecordBase["defaultAutoArchiveDuration"];
    defaultForumLayout: ChannelRecordBase["defaultForumLayout"];
    defaultReactionEmoji: ChannelRecordBase["defaultReactionEmoji"];
    defaultSortOrder: ChannelRecordBase["defaultSortOrder"];
    defaultThreadRateLimitPerUser: ChannelRecordBase["defaultThreadRateLimitPerUser"];
    flags_: Defined<ChannelRecordBase["flags_"]>;
    icon: ChannelRecordBase["icon"];
    iconEmoji: ChannelRecordBase["iconEmoji"];
    isMessageRequest: ChannelRecordBase["isMessageRequest"];
    isMessageRequestTimestamp: ChannelRecordBase["isMessageRequestTimestamp"];
    isSpam: ChannelRecordBase["isSpam"];
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastPinTimestamp"];
    member: ChannelRecordBase["member"];
    memberCount: ChannelRecordBase["memberCount"];
    memberIdsPreview: ChannelRecordBase["memberIdsPreview"];
    memberListId: ChannelRecordBase["memberListId"];
    messageCount: ChannelRecordBase["messageCount"];
    nicks: ChannelRecordBase["nicks"];
    nsfw_: ChannelRecordBase["nsfw_"];
    originChannelId: ChannelRecordBase["originChannelId"];
    ownerId: ChannelRecordBase["ownerId"];
    parent_id: ChannelRecordBase["parent_id"];
    parentChannelThreadType: undefined;
    permissionOverwrites_: Defined<ChannelRecordBase["permissionOverwrites_"]>;
    position_: ChannelRecordBase["position_"];
    rateLimitPerUser_: ChannelRecordBase["rateLimitPerUser_"];
    rawRecipients: Defined<ChannelRecordBase["rawRecipients"]>;
    recipients: Defined<ChannelRecordBase["recipients"]>;
    rtcRegion: ChannelRecordBase["rtcRegion"];
    safetyWarnings: ChannelRecordBase["safetyWarnings"];
    template: ChannelRecordBase["template"];
    themeColor: ChannelRecordBase["themeColor"];
    threadMetadata: ChannelRecordBase["threadMetadata"];
    topic_: ChannelRecordBase["topic_"];
    totalMessageSent: ChannelRecordBase["totalMessageSent"];
    type: ChannelType.UNKNOWN;
    userLimit_: ChannelRecordBase["userLimit_"];
    version: ChannelRecordBase["version"];
    videoQualityMode: ChannelRecordBase["videoQualityMode"];
}
