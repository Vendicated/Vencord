/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { CompanyRecord } from "./CompanyRecord";
import type { ImmutableRecord } from "./ImmutableRecord";
import type { IconSource } from "./misc";
import type { UserRecord } from "./UserRecord";

export type ApplicationRecordOwnProperties = Pick<ApplicationRecord, "aliases" | "bot" | "coverImage" | "description" | "developers" | "embeddedActivityConfig" | "eulaId" | "executables" | "flags" | "guild" | "guildId" | "hashes" | "hook" | "icon" | "id" | "integrationTypesConfig" | "isMonetized" | "maxParticipants" | "name" | "overlay" | "overlayCompatibilityHook" | "overlayMethods" | "overlayWarn" | "primarySkuId" | "privacyPolicyUrl" | "publishers" | "roleConnectionsVerificationUrl" | "slug" | "splash" | "storefront_available" | "storeListingSkuId" | "tags" | "team" | "termsOfServiceUrl" | "thirdPartySkus" | "type">;

export declare class ApplicationRecord<
    OwnProperties extends ApplicationRecordOwnProperties = ApplicationRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    /** @todo */
    constructor(applicationProperties: Record<string, any>);

    /** @todo */
    static createFromServer(applicationFromServer: Record<string, any>): ApplicationRecord;
    static supportsOutOfProcessOverlay(overlayMethods?: ApplicationOverlayMethodFlags | Nullish): boolean;

    get destinationSkuId(): string | undefined;
    getCoverImageURL(imageSize?: number | undefined): string | null;
    getIconSource(iconSize?: number | undefined, iconFormat?: string | Nullish): IconSource | null;
    getIconURL(iconSize?: number | undefined, iconFormat?: string | Nullish): string | null;
    getMaxParticipants(): number;
    getSplashURL(splashSize?: number | undefined, splashFormat?: string | Nullish): string | null;
    supportsIntegrationTypes(...integrationTypes: ApplicationIntegrationType[]): boolean;
    get supportsOutOfProcessOverlay(): boolean;

    aliases: string[];
    bot: UserRecord | null;
    coverImage: string | null;
    description: string | null;
    developers: CompanyRecord[];
    embeddedActivityConfig: EmbeddedActivityConfig | undefined;
    eulaId: string | null;
    executables: ApplicationExecutable[];
    flags: ApplicationFlags;
    /** @todo This is not a GuildRecord; it's a guild object from the API. */
    guild: Record<string, any> | null;
    guildId: string | null;
    hashes: string[];
    hook: boolean;
    icon: string | null;
    id: string;
    integrationTypesConfig: Partial<Record<ApplicationIntegrationType, ApplicationIntegrationTypeConfig>> | null;
    isMonetized: boolean;
    maxParticipants: number | undefined;
    name: string;
    overlay: boolean;
    overlayCompatibilityHook: boolean;
    overlayMethods: ApplicationOverlayMethodFlags;
    overlayWarn: boolean;
    primarySkuId: string | undefined;
    privacyPolicyUrl: string | undefined;
    publishers: CompanyRecord[];
    roleConnectionsVerificationUrl: string | undefined;
    slug: string | null;
    splash: string | null;
    storefront_available: boolean | undefined;
    storeListingSkuId: string | undefined;
    tags: string[];
    /** @todo This is a team object from the API. */
    team: Record<string, any> | null;
    termsOfServiceUrl: string | undefined;
    thirdPartySkus: string[];
    type: ApplicationType | null;
}

/** @todo Some properties may not actually be optional or unlikely may also be null. */
export interface EmbeddedActivityConfig {
    application_id: string;
    client_platform_config: Partial<Record<EmbeddedActivitySupportedPlatform, EmbeddedActivityClientPlatformConfig>>;
    default_orientation_lock_state?: OrientationLockState;
    displays_advertisements?: boolean;
    has_csp_exception?: boolean;
    requires_age_gate?: boolean;
    shelf_rank?: number;
    supported_platforms?: EmbeddedActivitySupportedPlatform[];
    tablet_default_orientation_lock_state?: OrientationLockState;
}

// Original name: EmbeddedActivitySupportedPlatforms
export enum EmbeddedActivitySupportedPlatform {
    ANDROID = "android",
    IOS = "ios",
    WEB = "web",
}

/** @todo Some properties may not actually be optional or unlikely may also be null. */
export interface EmbeddedActivityClientPlatformConfig {
    label_type?: EmbeddedActivityLabelType;
    label_until?: string | null;
    release_phase: string;
}

// Original name: EmbeddedActivityLabelTypes
export enum EmbeddedActivityLabelType {
    NONE = 0,
    NEW = 1,
    UPDATED = 2,
}

export enum OrientationLockState {
    UNLOCKED = 1,
    PORTRAIT = 2,
    LANDSCAPE = 3,
}

export interface ApplicationExecutable {
    arguments?: string[];
    isLauncher?: boolean;
    name: string;
    os: string;
}

export enum ApplicationIntegrationType {
    GUILD_INSTALL = 0,
    USER_INSTALL = 1,
}

export interface ApplicationIntegrationTypeConfig {
    oauth2InstallParams: ApplicationInstallParams | undefined;
}

// Original name: OAuth2Scopes
export enum OAuth2Scope {
    ACCOUNT_GLOBAL_NAME_UPDATE = "account.global_name.update",
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
    GATEWAY_CONNECT = "gateway.connect",
    GDM_JOIN = "gdm.join",
    GUILDS = "guilds",
    GUILDS_JOIN = "guilds.join",
    GUILDS_MEMBERS_READ = "guilds.members.read",
    IDENTIFY = "identify",
    MESSAGES_READ = "messages.read",
    OPENID = "openid",
    PAYMENT_SOURCES_COUNTRY_CODE = "payment_sources.country_code",
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
    /** Permissions serialized as a string. */
    permissions: string;
    scopes: OAuth2Scope[];
}

export enum ApplicationFlags {
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

export enum ApplicationOverlayMethodFlags {
    DEFAULT = 0,
    OUT_OF_PROCESS = 1 << 0,
}

// Original name: ApplicationTypes
export enum ApplicationType {
    GAME = 1,
    TICKETED_EVENTS = 3,
    GUILD_ROLE_SUBSCRIPTIONS = 4,
}
