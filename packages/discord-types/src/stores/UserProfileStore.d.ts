import { FluxStore, Guild, User } from "..";

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

export class UserProfileStore extends FluxStore {
    /**
     * @param userId the user ID of the profile being fetched.
     * @param guildId the guild ID to of the profile being fetched.
     * defaults to the internal symbol `NO GUILD ID` if nullish
     *
     * @returns true if the profile is being fetched, false otherwise.
     */
    isFetchingProfile(userId: string, guildId?: unknown): boolean;
    /**
     * Check if mutual friends for {@link userId} are currently being fetched.
     *
     * @param userId the user ID of the mutual friends being fetched.
     *
     * @returns true if mutual friends are being fetched, false otherwise.
     */
    isFetchingFriends(userId: string): boolean;

    get isSubmitting(): boolean;

    getUserProfile(userId: string): User | undefined;

    getGuildMemberProfile(userId: string, guildId: string | undefined): User | null;
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
