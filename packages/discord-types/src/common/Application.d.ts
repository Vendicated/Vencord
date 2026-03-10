import { Guild } from "./Guild";
import { User } from "./User";

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

export interface Application {
    id: string;
    name: string;
    icon: string | null;
    description: string;
    type: number | null;
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
    flags: number;
    maxParticipants: number | undefined;
    tags: string[];
    embeddedActivityConfig: Record<string, unknown> | undefined;
    team: ApplicationTeam | undefined;
    integrationTypesConfig: Record<string, Record<string, unknown>>;
    storefront_available: boolean;
    termsOfServiceUrl: string | undefined;
    privacyPolicyUrl: string | undefined;
    isDiscoverable: boolean;
    customInstallUrl: string | undefined;
    installParams: ApplicationInstallParams | undefined;
    directoryEntry: Record<string, unknown> | undefined;
    categories: string[] | undefined;
    linkedGames: string[] | undefined;
    deepLinkUri: string | undefined;
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
