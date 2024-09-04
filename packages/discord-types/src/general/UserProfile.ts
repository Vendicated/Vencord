/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { ApplicationInstallParams, ApplicationIntegrationType, ApplicationRecordOwnProperties } from "./ApplicationRecord";
import type { PremiumType } from "./UserRecord";

export type UserProfile<FetchFailed extends boolean = boolean> = FetchFailed extends true
    ? UserProfileFetchFailed
    : UserProfileFetchSucceeded;

export interface UserProfileBase {
    accentColor: number | Nullish;
    application: ProfileApplicationData | null;
    applicationRoleConnections: ProfileApplicationRoleConnectionData[];
    badges?: ProfileBadge[];
    banner: string | Nullish;
    bio: string;
    connectedAccounts: ProfileConnectedAccountData[];
    lastFetched: number;
    legacyUsername: string | Nullish;
    /** @todo Does not seem to be implemented. */
    popoutAnimationParticleType?: any /* |  Nullish */;
    premiumGuildSince: Date | null;
    premiumSince: Date | null;
    premiumType?: PremiumType | Nullish;
    profileEffectExpiresAt?: number | Nullish;
    profileEffectId?: string | undefined;
    profileFetchFailed: boolean;
    pronouns: string;
    themeColors?: ProfileThemeColors | Nullish;
    userId: string;
}

export interface UserProfileFetchSucceeded extends Required<UserProfileBase> {
    profileFetchFailed: false;
}

export interface UserProfileFetchFailed extends UserProfileBase {
    profileFetchFailed: true;
}

export interface ProfileApplicationData extends Pick<ApplicationRecordOwnProperties, "customInstallUrl" | "flags" | "id" | "installParams" | "primarySkuId" | "storefront_available"> {
    integrationTypesConfig: Partial<Record<ApplicationIntegrationType, {
        oauth2_install_params?: ApplicationInstallParams;
    } | null>>;
    popularApplicationCommandIds: string[] | undefined;
}

export interface ProfileApplicationRoleConnectionData {
    metadata: Record<string, any /* string | number */>;
    platform_name: string | null;
    platform_username: string | null;
}

export interface ProfileBadge {
    description: string;
    icon: string;
    id: string;
    link?: string;
}

export interface ProfileConnectedAccountData {
    id: string;
    metadata?: Record<string, any /* string | number | boolean */>;
    name: string;
    type: PlatformType;
    verified: boolean;
}

// Original name: PlatformTypes
export enum PlatformType {
    AMAZON_MUSIC = "amazon-music",
    BATTLENET = "battlenet",
    BUNGIE = "bungie",
    CONTACTS = "contacts",
    CRUNCHYROLL = "crunchyroll",
    DOMAIN = "domain",
    EBAY = "ebay",
    EPIC_GAMES = "epicgames",
    FACEBOOK = "facebook",
    GITHUB = "github",
    INSTAGRAM = "instagram",
    LEAGUE_OF_LEGENDS = "leagueoflegends",
    PAYPAL = "paypal",
    PLAYSTATION = "playstation",
    PLAYSTATION_STAGING = "playstation-stg",
    REDDIT = "reddit",
    RIOT_GAMES = "riotgames",
    ROBLOX = "roblox",
    SAMSUNG = "samsung",
    SKYPE = "skype",
    SOUNDCLOUD = "soundcloud",
    SPOTIFY = "spotify",
    STEAM = "steam",
    TIKTOK = "tiktok",
    TWITCH = "twitch",
    TWITTER = "twitter",
    TWITTER_LEGACY = "twitter_legacy",
    XBOX = "xbox",
    YOUTUBE = "youtube",
}

export type ProfileThemeColors = [primaryColor: number, accentColor: number];
