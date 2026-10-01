import { ActivityLabelType, ApplicationFlags, ApplicationType, CarouselItemType, LinkedGameType, OrientationLockState } from "../../enums";
import { Guild } from "./Guild";
import { User } from "./User";

export type EmbeddedActivityPlatform = "ios" | "android" | "web";

export interface EmbeddedActivityPlatformConfig {
    label_type: ActivityLabelType;
    label_from: string | null;
    label_until: string | null;
    release_phase: string;
    omit_badge_from_surfaces: string[];
}

export interface EmbeddedActivityConfig {
    application_id: string;
    activity_preview_video_asset_id: string | null;
    supported_platforms: EmbeddedActivityPlatform[];
    default_orientation_lock_state: OrientationLockState;
    tablet_default_orientation_lock_state: OrientationLockState;
    requires_age_gate: boolean;
    legacy_responsive_aspect_ratio: boolean;
    premium_tier_requirement: number | null;
    free_period_starts_at: string | null;
    free_period_ends_at: string | null;
    client_platform_config: Partial<Record<EmbeddedActivityPlatform, EmbeddedActivityPlatformConfig>>;
    shelf_rank: number;
    has_csp_exception: boolean;
    displays_advertisements: boolean;
    blocked_locales: string[];
    supported_locales: string[];
}

export interface ApplicationExecutable {
    os: "win32" | "darwin" | "linux";
    name: string;
    isLauncher: boolean;
}

export interface ApplicationThirdPartySku {
    id: string;
    sku: string;
    distributor: string;
}

export interface ApplicationDeveloper {
    id: string;
    name: string;
}

export interface ApplicationInstallParams {
    permissions: string | null;
    scopes: string[];
}

export interface ApplicationIntegrationTypeConfig {
    oauth2InstallParams: ApplicationInstallParams;
}

export interface ApplicationDirectoryEntry {
    guild_count?: number;
    detailed_description?: string;
    supported_locales?: string[];
    carousel_items?: { asset_id: string; type: CarouselItemType; }[];
}

export interface Application {
    id: string;
    name: string;
    icon: string | null;
    description: string;
    type: ApplicationType | null;
    coverImage: string | null;
    primarySkuId: string | undefined;
    bot: User | null;
    splash: string | undefined;
    thirdPartySkus: ApplicationThirdPartySku[];
    isMonetized: boolean;
    isVerified: boolean;
    roleConnectionsVerificationUrl: string | undefined;
    parentId: string | undefined;
    connectionEntrypointUrl: string | undefined;
    overlay: boolean;
    overlayWarn: boolean;
    overlayCompatibilityHook: boolean;
    overlayMethods: number;
    hook: boolean;
    aliases: string[];
    publishers: ApplicationDeveloper[];
    developers: ApplicationDeveloper[];
    storeListingSkuId: string | undefined;
    guildId: string | null;
    guild: Guild | undefined;
    executables: ApplicationExecutable[];
    hashes: string[];
    eulaId: string | undefined;
    slug: string | undefined;
    flags: ApplicationFlags;
    maxParticipants: number | null;
    tags: string[];
    embeddedActivityConfig: EmbeddedActivityConfig | undefined;
    team: ApplicationTeam | undefined;
    integrationTypesConfig: Record<string, ApplicationIntegrationTypeConfig>;
    storefront_available: boolean;
    termsOfServiceUrl: string | undefined;
    privacyPolicyUrl: string | undefined;
    isDiscoverable: boolean;
    customInstallUrl: string | undefined;
    installParams: ApplicationInstallParams | undefined;
    directoryEntry: ApplicationDirectoryEntry | undefined;
    categories: string[] | undefined;
    linkedGames: ApplicationLinkedGame[] | undefined;
    deepLinkUri: string | undefined;
}

export interface ApplicationLinkedGame {
    id: string;
    type: LinkedGameType;
    application?: Application;
}

export interface ApplicationTeam {
    id: string;
    name: string;
    icon: string | null;
    members: ApplicationTeamMember[];
    ownerUserId: string;
}

export interface ApplicationTeamMember {
    user: User;
    teamId: string;
    membershipState: number;
    permissions: string[];
    role: string;
}
