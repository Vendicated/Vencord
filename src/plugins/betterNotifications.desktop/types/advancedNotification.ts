/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface AdvancedNotification {
    omitViewTracking: boolean;
    tag: string;
    sound: string;
    volume: number;
    isUserAvatar: boolean;
    messageRecord: MessageRecord;
}

interface AttachmentRecord {
    content_scan_version: number;
    content_type: string;
    filename: string;
    height: number;
    id: string;
    placeholder: string;
    placeholder_version: number;
    proxy_url: string;
    size: number;
    url: string;
    width: number;
    spoiler: boolean;
}

export interface MessageRecord {
    type: number;
    content: string;
    attachments: AttachmentRecord[];
    embeds: any[];
    timestamp: string;
    editedTimestamp: any;
    flags: number;
    components: any[];
    codedLinks: any[];
    stickers: any[];
    stickerItems: any[];
    id: string;
    channel_id: string;
    author: Author;
    bot: boolean;
    pinned: boolean;
    mentions: string[];
    mentionRoles: any[];
    mentionChannels: any[];
    mentionEveryone: boolean;
    mentioned: boolean;
    tts: boolean;
    giftCodes: any[];
    state: string;
    nonce: any;
    blocked: boolean;
    ignored: boolean;
    call?: Call;
    webhookId: any;
    reactions: any[];
    applicationId: any;
    application: any;
    activity: any;
    activityInstance: any;
    interaction: any;
    interactionData: any;
    interactionMetadata: any;
    interactionError: any;
    messageReference: any;
    isSearchHit: boolean;
    loggingName: any;
    referralTrialOfferId: any;
    giftingPrompt: any;
    messageSnapshots: any[];
    isUnsupported: boolean;
    changelogId: any;
    chatWallpaperInfo: any;
}

export interface PrimaryGuild {
    identityGuildId: string;
    identityEnabled: boolean;
    tag: string;
    badge: string;
}

export interface Author {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    avatarDecorationData: any;
    banner: any;
    email: any;
    verified: boolean;

    /** @deprecated is very unrealiable. Use Author.discriminator != "0" */
    bot: boolean;

    system: boolean;
    mfaEnabled: boolean;
    mobile: boolean;
    desktop: boolean;
    flags: number;
    publicFlags: number;
    purchasedFlags: number;
    premiumUsageFlags: number;
    phone: any;
    guildMemberAvatars: GuildMemberAvatars;
    hasBouncedEmail: boolean;
    personalConnectionId: any;
    globalName?: string;
    primaryGuild?: PrimaryGuild;
    collectibles: any;
}

export interface Call {
    participants: string[];
    endedTimestamp: any;
    duration: any;
}


export interface GuildMemberAvatars { }
