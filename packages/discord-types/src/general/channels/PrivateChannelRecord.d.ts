/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish } from "../../internal";
import type { ChannelRecipient, ChannelRecordBase, ChannelType } from "./ChannelRecord";

export type PrivateChannelRecord = DMChannelRecord | GroupDMChannelRecord;

export abstract class PrivateChannelRecordBase extends ChannelRecordBase {
    /** @todo */
    constructor(channelProperties: Record<string, any>);

    /** @todo */
    static fromServer(channelFromServer: Record<string, any>): PrivateChannelRecord;
    static sortRecipients(recipients: ChannelRecipient[] | Nullish, channelId: string): string[];

    addRecipient(recipientUserId: string, nickname: string | undefined, currentUserId: string): this;
    getRecipientId(): string | undefined;
    removeRecipient(recipientUserId: string): this;

    application_id: ChannelRecordBase["application_id"];
    appliedTags?: undefined;
    availableTags?: undefined;
    bitrate_?: undefined;
    defaultAutoArchiveDuration?: undefined;
    defaultForumLayout?: undefined;
    defaultReactionEmoji?: undefined;
    defaultSortOrder?: undefined;
    defaultThreadRateLimitPerUser?: undefined;
    guild_id: null;
    icon: ChannelRecordBase["icon"];
    iconEmoji?: undefined;
    isMessageRequest: ChannelRecordBase["isMessageRequest"];
    isMessageRequestTimestamp: ChannelRecordBase["isMessageRequestTimestamp"];
    isSpam: Defined<ChannelRecordBase["isSpam"]>;
    lastMessageId: ChannelRecordBase["lastMessageId"];
    lastPinTimestamp: ChannelRecordBase["lastPinTimestamp"];
    member?: undefined;
    memberCount?: undefined;
    memberIdsPreview?: undefined;
    memberListId?: undefined;
    messageCount?: undefined;
    nicks: Defined<ChannelRecordBase["nicks"]>;
    nsfw_?: undefined;
    originChannelId?: undefined;
    ownerId: ChannelRecordBase["ownerId"];
    parent_id?: undefined;
    parentChannelThreadType?: undefined;
    permissionOverwrites_?: undefined;
    position_?: undefined;
    rateLimitPerUser_?: undefined;
    rawRecipients: Defined<ChannelRecordBase["rawRecipients"]>;
    recipients: Defined<ChannelRecordBase["recipients"]>;
    rtcRegion?: undefined;
    safetyWarnings: ChannelRecordBase["safetyWarnings"];
    template?: undefined;
    themeColor?: undefined;
    threadMetadata?: undefined;
    topic_?: undefined;
    totalMessageSent?: undefined;
    type: ChannelType.DM | ChannelType.GROUP_DM;
    userLimit_?: undefined;
    version?: undefined;
    videoQualityMode?: undefined;
    voiceBackgroundDisplay?: undefined;
}

export class DMChannelRecord extends PrivateChannelRecordBase {
    application_id: undefined;
    icon: undefined;
    name: "";
    ownerId: undefined;
    type: ChannelType.DM;
}

export class GroupDMChannelRecord extends PrivateChannelRecordBase {
    isMessageRequest: undefined;
    isMessageRequestTimestamp: undefined;
    ownerId: PrivateChannelRecordBase["ownerId"];
    type: ChannelType.GROUP_DM;
}
