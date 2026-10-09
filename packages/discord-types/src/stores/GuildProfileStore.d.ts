import { Emoji, FluxStore, Guild } from "..";

export enum GuildVisibility {
    PUBLIC = 1,
    RESTRICTED = 2,
    PUBLIC_WITH_RECRUITMENT = 3,
}

export type GuildProfileFetchStatus = "NOT_FETCHED" | "FETCHING" | "FETCHED";

export interface GuildProfileTrait {
    emoji?: Emoji;
    label: string;
}

export interface GuildProfileGameActivity {
    level: number;
    score: number;
}

export interface GuildProfile extends Pick<
    Guild,
    | "id"
    | "name"
    | "description"
    | "icon"
    | "features"
    | "premiumSubscriberCount"
    | "premiumTier"
> {
    customBanner: string | null;
    onlineCount: number;
    memberCount: number;
    brandColorPrimary: string | null;
    visibility: GuildVisibility;
    traits: GuildProfileTrait[];
    gameApplicationIds: string[];
    gameActivity: Record<string, GuildProfileGameActivity>;
    games: unknown | undefined;
    tag: string | null;
    badge: number;
    badgeColorPrimary: string;
    badgeColorSecondary: string;
    badgeHash: string | null;
}

export class GuildProfileStore extends FluxStore {
    getProfile(guildId: string): GuildProfile | null;
    getFetchStatus(guildId: string): GuildProfileFetchStatus;
    getLastSyncTimestamp(guildId: string): number | null;
    getNextFetchAllowedAt(guildId: string): number | null;
    getIsUpdating(guildId: string): boolean;
    getErrorCode(guildId: string): number | null;
}
