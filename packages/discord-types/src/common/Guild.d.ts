import { User } from './User';
import { Role } from './Role';
export type GuildFeatures =
    | "INVITE_SPLASH"
    | "VIP_REGIONS"
    | "VANITY_URL"
    | "MORE_EMOJI"
    | "MORE_STICKERS"
    | "VERIFIED"
    | "COMMERCE"
    | "DISCOVERABLE"
    | "COMMUNITY"
    | "FEATURABLE"
    | "NEWS"
    | "HUB"
    | "PARTNERED"
    | "ANIMATED_ICON"
    | "BANNER"
    | "ENABLED_DISCOVERABLE_BEFORE"
    | "WELCOME_SCREEN_ENABLED"
    | "MEMBER_VERIFICATION_GATE_ENABLED"
    | "PREVIEW_ENABLED"
    | "ROLE_SUBSCRIPTIONS_ENABLED"
    | "ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE"
    | "CREATOR_MONETIZABLE"
    | "CREATOR_MONETIZABLE_DISABLED"
    | "PRIVATE_THREADS"
    | "THREADS_ENABLED"
    | "THREADS_ENABLED_TESTING"
    | "NEW_THREAD_PERMISSIONS"
    | "ROLE_ICONS"
    | "TEXT_IN_VOICE_ENABLED"
    | "HAS_DIRECTORY_ENTRY"
    | "ANIMATED_BANNER"
    | "LINKED_TO_HUB"
    | "EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT"
    | "GUILD_HOME_TEST";


export class Guild {
    constructor(guild: object);
    afkChannelId: string | undefined;
    afkTimeout: number;
    applicationCommandCounts: {
        0: number;
        1: number;
        2: number;
    };
    application_id: unknown;
    banner: string | undefined;
    defaultMessageNotifications: number;
    description: string | undefined;
    discoverySplash: string | undefined;
    explicitContentFilter: number;
    features: Set<GuildFeatures>;
    hubType: unknown;
    icon: string | undefined;
    id: string;
    joinedAt: Date;
    maxMembers: number;
    maxVideoChannelUsers: number;
    mfaLevel: number;
    name: string;
    nsfwLevel: number;
    ownerId: string;
    preferredLocale: string;
    premiumProgressBarEnabled: boolean;
    premiumSubscriberCount: number;
    premiumTier: number;
    publicUpdatesChannelId: string | undefined;
    roles: Record<string, Role>;
    rulesChannelId: string | undefined;
    splash: string | undefined;
    systemChannelFlags: number;
    systemChannelId: string | undefined;
    vanityURLCode: string | undefined;
    verificationLevel: number;
}
