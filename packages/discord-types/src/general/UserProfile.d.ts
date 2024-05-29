/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { UserPremiumType } from "./UserRecord";

export type UserProfile<FetchFailed extends boolean = boolean> = FetchFailed extends true
    ? UserProfileFetchFailed
    : UserProfileFetchSucceeded;

export interface UserProfileFetchFailed {
    accentColor: null;
    application: null;
    applicationRoleConnections: [];
    banner: null;
    bio: "";
    connectedAccounts: [];
    lastFetched: number;
    legacyUsername: null;
    premiumGuildSince: null;
    premiumSince: null;
    profileFetchFailed: true;
    pronouns: "";
    userId: string;
}

export interface UserProfileFetchSucceeded {
    accentColor: number | Nullish;
    application: Application | null;
    applicationRoleConnections: ApplicationRoleConnection[];
    badges: ProfileBadge[];
    banner: string | Nullish;
    bio: string;
    connectedAccounts: ConnectedAccount[];
    lastFetched: number;
    legacyUsername: string | Nullish;
    popoutAnimationParticleType: any /* |  Nullish */; // TEMP
    premiumGuildSince: Date | null;
    premiumSince: Date | null;
    premiumType: UserPremiumType | Nullish;
    profileEffectId: string | undefined;
    profileFetchFailed: false;
    pronouns: string;
    themeColors: ProfileThemeColors | Nullish;
    userId: string;
}

// TODO: Move application related types to their own file.
export const enum ApplicationFlags {
    EMBEDDED_RELEASED = 1 << 1,
    EMBEDDED_IAP = 1 << 3,
    APPLICATION_AUTO_MODERATION_RULE_CREATE_BADGE = 1 << 6,
    GATEWAY_PRESENCE = 1 << 12,
    GATEWAY_PRESENCE_LIMITED = 1 << 13,
    GATEWAY_GUILD_MEMBERS = 1 << 14,
    GATEWAY_GUILD_MEMBERS_LIMITED = 1 << 15,
    EMBEDDED = 1 << 17,
    GATEWAY_MESSAGE_CONTENT = 1 << 18,
    GATEWAY_MESSAGE_CONTENT_LIMITED = 1 << 19,
    EMBEDDED_FIRST_PARTY = 1 << 20,
    APPLICATION_COMMAND_BADGE = 1 << 23,
    SOCIAL_LAYER_INTEGRATION = 1 << 27,
}

// Original name: OAuth2Scopes
export const enum OAuth2Scope {
    ACTIVITIES_READ = "activities.read",
    ACTIVITIES_WRITE = "activities.write",
    APPLICATIONS_BUILDS_READ = "applications.builds.read",
    APPLICATIONS_BUILDS_UPLOAD = "applications.builds.upload",
    APPLICATIONS_COMMANDS = "applications.commands",
    APPLICATIONS_COMMANDS_PERMISSIONS_UPDATE = "applications.commands.permissions.update",
    APPLICATIONS_COMMANDS_UPDATE = "applications.commands.update",
    APPLICATIONS_ENTITLEMENTS = "applications.entitlements",
    APPLICATIONS_STORE_UPDATE = "applications.store.update",
    BOT = "bot",
    CONNECTIONS = "connections",
    DM_CHANNELS_MESSAGES_READ = "dm_channels.messages.read",
    DM_CHANNELS_MESSAGES_WRITE = "dm_channels.messages.write",
    DM_CHANNELS_READ = "dm_channels.read",
    EMAIL = "email",
    GDM_JOIN = "gdm.join",
    GUILDS = "guilds",
    GUILDS_JOIN = "guilds.join",
    GUILDS_MEMBERS_READ = "guilds.members.read",
    IDENTIFY = "identify",
    MESSAGES_READ = "messages.read",
    OPENID = "openid",
    PRESENCES_READ = "presences.read",
    PRESENCES_WRITE = "presences.write",
    RELATIONSHIPS_READ = "relationships.read",
    RELATIONSHIPS_WRITE = "relationships.write",
    ROLE_CONNECTIONS_WRITE = "role_connections.write",
    RPC = "rpc",
    RPC_ACTIVITIES_WRITE = "rpc.activities.write",
    RPC_NOTIFICATIONS_READ = "rpc.notifications.read",
    RPC_SCREENSHARE_READ = "rpc.screenshare.read",
    RPC_SCREENSHARE_WRITE = "rpc.screenshare.write",
    RPC_VIDEO_READ = "rpc.video.read",
    RPC_VIDEO_WRITE = "rpc.video.write",
    RPC_VOICE_READ = "rpc.voice.read",
    RPC_VOICE_WRITE = "rpc.voice.write",
    VOICE = "voice",
    WEBHOOK_INCOMING = "webhook.incoming",
}

export interface ApplicationInstallParams {
    permissions: string; // Permissions serialized as string
    scopes: OAuth2Scope[];
}

export const enum ApplicationIntegrationType {
    GUILD_INSTALL = 0,
    USER_INSTALL = 1,
}

export interface Application {
    customInstallUrl: string | undefined;
    flags: ApplicationFlags;
    id: string;
    installParams: ApplicationInstallParams | undefined;
    integrationTypesConfig: Partial<Record<ApplicationIntegrationType, {
        oauth2_install_params?: ApplicationInstallParams;
    } | null>>;
    popularApplicationCommandIds: string[] | undefined;
    primarySkuId: string | undefined;
    storefront_available: boolean;
}

export interface ApplicationRoleConnection {
    metadata: Record<string, string | number>;
    platform_name: string | null;
    platform_username: string | null;
}

export interface ProfileBadge {
    description: string;
    icon: string;
    id: string;
    link?: string;
}

// Original name: PlatformTypes
export const enum PlatformType {
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

export interface ConnectedAccount {
    id: string;
    metadata?: Record<string, string | number | boolean>;
    name: string;
    type: PlatformType;
    verified: boolean;
}

export type ProfileThemeColors = [primaryColor: number, accentColor: number];
