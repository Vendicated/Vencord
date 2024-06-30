/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Defined, Nullish, OmitOptional, Optional, PartialOnUndefined } from "../../internal";
import type { ChannelBaseProperties, ChannelRecipient, ChannelRecordBase, ChannelRecordOwnProperties, ChannelType } from "./ChannelRecord";

export type PrivateChannelRecord = DMChannelRecord | GroupDMChannelRecord;

// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/59000
export type PrivateChannelProperties<Channel extends PrivateChannelRecordBase> = ChannelBaseProperties & Optional<PartialOnUndefined<OmitOptional<ChannelRecordOwnProperties<Channel>>>, Nullish, "rawRecipients" | "recipients" | "safetyWarnings">;

type PrivateChannelType = ChannelType.DM | ChannelType.GROUP_DM;

export declare abstract class PrivateChannelRecordBase extends ChannelRecordBase {
    constructor(channelProperties: PrivateChannelProperties<PrivateChannelRecordBase>);

    static fromServer<Type extends PrivateChannelType | Nullish = undefined>(
        /** @todo */
        channelFromServer: { type?: Type; } & Record<string, any>
    ): {
        [ChannelType.DM]: DMChannelRecord;
        [ChannelType.GROUP_DM]: GroupDMChannelRecord;
    }[Type extends PrivateChannelType ? Type : ChannelType.DM];
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
    flags_: Defined<ChannelRecordBase["flags_"]>;
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
    type: PrivateChannelType;
    userLimit_?: undefined;
    version?: undefined;
    videoQualityMode?: undefined;
    voiceBackgroundDisplay?: undefined;
}

export declare class DMChannelRecord extends PrivateChannelRecordBase {
    constructor(channelProperties: PrivateChannelProperties<DMChannelRecord>);

    application_id: undefined;
    icon: undefined;
    name: "";
    ownerId: undefined;
    type: ChannelType.DM;
}

export declare class GroupDMChannelRecord extends PrivateChannelRecordBase {
    constructor(channelProperties: PrivateChannelProperties<GroupDMChannelRecord>);

    isMessageRequest: undefined;
    isMessageRequestTimestamp: undefined;
    ownerId: PrivateChannelRecordBase["ownerId"];
    type: ChannelType.GROUP_DM;
}
