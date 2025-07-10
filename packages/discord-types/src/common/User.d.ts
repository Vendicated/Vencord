// TODO: a lot of optional params can also be null, not just undef

import { DiscordRecord } from "./Record";

export interface ConnectedAccount {
    type: "twitch" | "youtube" | "skype" | "steam" | "leagueoflegends" | "battlenet" | "bluesky" | "bungie" | "reddit" | "twitter" | "twitter_legacy" | "spotify" | "facebook" | "xbox" | "samsung" | "contacts" | "instagram" | "mastodon" | "soundcloud" | "github" | "playstation" | "playstation-stg" | "epicgames" | "riotgames" | "roblox" | "paypal" | "ebay" | "tiktok" | "crunchyroll" | "domain" | "amazon-music";
    /**
     * underlying id of connected account
     * eg. account uuid
     */
    id: string;
    /**
     * display name of connected account
     */
    name: string;
    verified: boolean;
    metadata?: Record<string, unknown>;
}

export class User extends DiscordRecord {
    constructor(user: object);
    accentColor: number;
    avatar: string;
    banner: string;
    bio: string;
    bot: boolean;
    connectedAccounts: ConnectedAccount[] | undefined;
    desktop: boolean;
    discriminator: string;
    email: string | undefined;
    flags: number;
    globalName: string | undefined;
    guildMemberAvatars: Record<string, string>;
    id: string;
    mfaEnabled: boolean;
    mobile: boolean;
    nsfwAllowed: boolean | undefined;
    phone: string | undefined;
    premiumType: number | undefined;
    premiumUsageFlags: number;
    publicFlags: number;
    purchasedFlags: number;
    system: boolean;
    username: string;
    verified: boolean;
    themeColors?: [number, number];

    get createdAt(): Date;
    get hasPremiumPerks(): boolean;
    get tag(): string;
    get usernameNormalized(): string;

    addGuildAvatarHash(guildId: string, avatarHash: string): User;
    getAvatarSource(guildId: string, canAnimate?: boolean): { uri: string; };
    getAvatarURL(guildId?: string | null, t?: unknown, canAnimate?: boolean): string;
    hasAvatarForGuild(guildId: string): boolean;
    hasDisabledPremium(): boolean;
    hasFlag(flag: number): boolean;
    hasFreePremium(): boolean;
    hasHadSKU(e: unknown): boolean;
    hasPremiumUsageFlag(flag: number): boolean;
    hasPurchasedFlag(flag: number): boolean;
    hasUrgentMessages(): boolean;
    isClaimed(): boolean;
    isLocalBot(): boolean;
    isNonUserBot(): boolean;
    isPhoneVerified(): boolean;
    isStaff(): boolean;
    isSystemUser(): boolean;
    isVerifiedBot(): boolean;
    removeGuildAvatarHash(guildId: string): User;
    toString(): string;
}

export interface UserJSON {
    avatar: string;
    avatarDecoration: unknown | undefined;
    discriminator: string;
    id: string;
    publicFlags: number;
    username: string;
}
