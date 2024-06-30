/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SnakeCasedProperties } from "type-fest";

import type { Nullish, Optional } from "../internal";
import type { ImmutableRecord } from "./ImmutableRecord";
import type { IconSource } from "./misc";

export type UserRecordOwnProperties = Pick<UserRecord, "avatar" | "avatarDecorationData" | "banner" | "bot" | "clan" | "desktop" | "discriminator" | "email" | "flags" | "globalName" | "guildMemberAvatars" | "hasAnyStaffLevel" | "hasBouncedEmail" | "hasFlag" | "id" | "isStaff" | "isStaffPersonal" | "mfaEnabled" | "mobile" | "nsfwAllowed" | "personalConnectionId" | "phone" | "premiumType" | "premiumUsageFlags" | "publicFlags" | "purchasedFlags" | "system" | "username" | "verified">;

export type UserProperties = Optional<Omit<UserRecordOwnProperties, "avatarDecorationData" | "clan" | "premiumType" | "hasAnyStaffLevel" | "hasFlag" | "isStaff" | "isStaffPersonal" | "nsfwAllowed">, Nullish, "id", true>
    & SnakeCasedProperties<Optional<Pick<UserRecordOwnProperties, "globalName" | "hasBouncedEmail" | "mfaEnabled" | "personalConnectionId" | "publicFlags" | "purchasedFlags" | "premiumUsageFlags">, Nullish>>
    & Partial<Record<"avatar_decoration_data" | "avatarDecorationData", unknown>>
    & Partial<Record<"premium_type" | "premiumType", UserRecord["premiumType"] | 0>>
    & { clan?: SnakeCasedProperties<UserClanData> | UserClanData | Nullish; };

export declare class UserRecord<
    OwnProperties extends UserRecordOwnProperties = UserRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(userProperties: UserProperties);

    addGuildAvatarHash(guildId: string, avatarHash: string): this;
    get avatarDecoration(): AvatarDecorationData | null;
    set avatarDecoration(avatarDecorationData: {
        asset: string;
        sku_id?: string;
        skuId?: string;
    } | null);
    get createdAt(): Date;
    getAvatarSource(
        guildId?: string | Nullish,
        canAnimate?: boolean | undefined /* = false */,
        avatarSize?: number | undefined /* = 128 */
    ): IconSource;
    getAvatarURL(
        guildId?: string | Nullish,
        avatarSize?: number | undefined /* = 128 */,
        canAnimate?: boolean | undefined /* = false */
    ): string;
    hasAvatarForGuild(guildId?: string | Nullish): boolean;
    hasDisabledPremium(): boolean;
    hasFreePremium(): boolean;
    hasHadPremium(): boolean;
    hasHadSKU(skuId: string): boolean;
    hasPremiumUsageFlag(flag: number): boolean;
    hasPurchasedFlag(flag: number): boolean;
    hasUrgentMessages(): boolean;
    hasVerifiedEmailOrPhone(): boolean;
    isClaimed(): boolean;
    isClyde(): boolean;
    isLocalBot(): boolean;
    isNonUserBot(): boolean;
    isPhoneVerified(): boolean;
    isPomelo(): boolean;
    isSystemUser(): boolean;
    isVerifiedBot(): boolean;
    removeGuildAvatarHash(guildId: string): this;
    get tag(): string;

    avatar: string | null;
    avatarDecorationData: AvatarDecorationData | null;
    banner: string | Nullish;
    bot: boolean;
    clan: UserClanData | null;
    desktop: boolean;
    discriminator: string;
    email: string | null;
    flags: UserFlags;
    globalName: string | Nullish;
    guildMemberAvatars: { [guildId: string]: string; };
    hasAnyStaffLevel: () => boolean;
    hasBouncedEmail: boolean;
    hasFlag: (flag: number) => boolean;
    id: string;
    isStaff: () => boolean;
    isStaffPersonal: () => boolean;
    mfaEnabled: boolean;
    mobile: boolean;
    nsfwAllowed: boolean;
    personalConnectionId: string | null;
    phone: string | null;
    premiumType: UserPremiumType | Nullish;
    premiumUsageFlags: number;
    publicFlags: UserFlags;
    purchasedFlags: number;
    system: boolean;
    username: string;
    verified: boolean;
}

export interface AvatarDecorationData {
    asset: string;
    skuId: string;
}

export interface UserClanData {
    badge: string | null;
    identityEnabled: boolean | null;
    identityGuildId: string | null;
    tag: string | null;
}

export enum UserFlags {
    STAFF = 1 << 0,
    PARTNER = 1 << 1,
    HYPESQUAD = 1 << 2,
    BUG_HUNTER_LEVEL_1 = 1 << 3,
    MFA_SMS = 1 << 4,
    PREMIUM_PROMO_DISMISSED = 1 << 5,
    HYPESQUAD_ONLINE_HOUSE_1 = 1 << 6,
    HYPESQUAD_ONLINE_HOUSE_2 = 1 << 7,
    HYPESQUAD_ONLINE_HOUSE_3 = 1 << 8,
    PREMIUM_EARLY_SUPPORTER = 1 << 9,
    TEAM_PSEUDO_USER = 1 << 10,
    HAS_UNREAD_URGENT_MESSAGES = 1 << 13,
    BUG_HUNTER_LEVEL_2 = 1 << 14,
    VERIFIED_BOT = 1 << 16,
    VERIFIED_DEVELOPER = 1 << 17,
    CERTIFIED_MODERATOR = 1 << 18,
    BOT_HTTP_INTERACTIONS = 1 << 19,
    SPAMMER = 1 << 20,
    DISABLE_PREMIUM = 1 << 21,
    ACTIVE_DEVELOPER = 1 << 22,
    PROVISIONAL_ACCOUNT = 1 << 23,
    QUARANTINED = 0x10_00_00_00_00_00,
    COLLABORATOR = 0x4_00_00_00_00_00_00,
    RESTRICTED_COLLABORATOR = 0x8_00_00_00_00_00_00
}

// Original name: PremiumTypes
export enum UserPremiumType {
    /** Nitro Classic */
    TIER_1 = 1,
    /** Nitro Standard */
    TIER_2 = 2,
    /** Nitro Basic */
    TIER_0 = 3,
}
