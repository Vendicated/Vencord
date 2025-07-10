import { FluxStore, Guild, User, Application, ApplicationInstallParams } from "..";
import { ApplicationIntegrationType } from "../../enums";

export interface MutualFriend {
    /**
     * the userid of the mutual friend
     */
    key: string;
    /**
     * the status of the mutual friend
     */
    status: "online" | "offline" | "idle" | "dnd";
    /**
     * the user object of the mutual friend
     */
    user: User;
}

export interface MutualGuild {
    /**
     * the guild object of the mutual guild
     */
    guild: Guild;
    /**
     * the user's nickname in the guild, if any
     */
    nick: string | null;

}

export interface ProfileBadge {
    id: string;
    description: string;
    icon: string;
    link?: string;
}

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
    metadata?: Record<string, string>;
}

export interface ProfileApplication {
    id: string;
    customInstallUrl: string | undefined;
    installParams: ApplicationInstallParams | undefined;
    flags: number;
    popularApplicationCommandIds?: string[];
    integrationTypesConfig: Record<ApplicationIntegrationType, Partial<{
        oauth2_install_params: ApplicationInstallParams;
    }>>;
    primarySkuId: string | undefined;
    storefront_available: boolean;
}

export interface UserProfileBase extends Pick<User, "banner"> {
    accentColor: number | null;
    /**
     * often empty for guild profiles, get the user profile for badges
     */
    badges: ProfileBadge[];
    bio: string | undefined;
    popoutAnimationParticleType: string | null;
    profileEffectExpiresAt: number | Date | undefined;
    profileEffectId: undefined | string;
    /**
     * often an empty string when not set
     */
    pronouns: string | "" | undefined;
    themeColors: [number, number] | undefined;
    userId: string;
}

export interface ApplicationRoleConnection {
    application: Application;
    application_metadata: Record<string, any>;
    metadata: Record<string, any>;
    platform_name: string;
    platform_username: string;
}

export interface UserProfile extends UserProfileBase, Pick<User, "premiumType"> {
    /** If this is a bot user profile, this will be its application */
    application: ProfileApplication | null;
    applicationRoleConnections: ApplicationRoleConnection[] | undefined;
    connectedAccounts: ConnectedAccount[] | undefined;
    fetchStartedAt: number;
    fetchEndedAt: number;
    legacyUsername: string | undefined;
    premiumGuildSince: Date | null;
    premiumSince: Date | null;
}

export class UserProfileStore extends FluxStore {
    /**
     * @param userId the user ID of the profile being fetched.
     * @param guildId the guild ID to of the profile being fetched.
     * defaults to the internal symbol `NO GUILD ID` if nullish
     *
     * @returns true if the profile is being fetched, false otherwise.
     */
    isFetchingProfile(userId: string, guildId?: string): boolean;
    /**
     * Check if mutual friends for {@link userId} are currently being fetched.
     *
     * @param userId the user ID of the mutual friends being fetched.
     *
     * @returns true if mutual friends are being fetched, false otherwise.
     */
    isFetchingFriends(userId: string): boolean;

    get isSubmitting(): boolean;

    getUserProfile(userId: string): UserProfile | undefined;

    getGuildMemberProfile(userId: string, guildId: string | undefined): UserProfileBase | null;
    /**
     * Get the mutual friends of a user.
     *
     * @param userId the user ID of the user to get the mutual friends of.
     *
     * @returns an array of mutual friends, or undefined if the user has no mutual friends
     */
    getMutualFriends(userId: string): MutualFriend[] | undefined;
    /**
     * Get the count of mutual friends for a user.
     *
     * @param userId the user ID of the user to get the mutual friends count of.
     *
     * @returns the count of mutual friends, or undefined if the user has no mutual friends
     */
    getMutualFriendsCount(userId: string): number | undefined;
    /**
     * Get the mutual guilds of a user.
     *
     * @param userId the user ID of the user to get the mutual guilds of.
     *
     * @returns an array of mutual guilds, or undefined if the user has no mutual guilds
     */
    getMutualGuilds(userId: string): MutualGuild[] | undefined;
}
