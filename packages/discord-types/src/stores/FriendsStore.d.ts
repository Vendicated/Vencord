import { FluxStore, Guild, User } from "..";

export type FriendsSection = "ADD_FRIEND" | "ALL" | "ONLINE" | "PENDING" | "PENDING_IGNORED" | "SPAM" | "SUGGESTIONS";

export enum RelationshipType {
    NONE = 0,
    FRIEND = 1,
    BLOCKED = 2,
    PENDING_INCOMING = 3,
    PENDING_OUTGOING = 4,
    IMPLICIT = 5,
    SUGGESTION = 6
}

export type StatusType = "online" | "offline" | "idle" | "dnd" | "invisible" | "streaming" | "unknown";

export enum GiftIntentType {
    FRIEND_ANNIVERSARY = 0
}

export interface ApplicationStream {
    channelId: string;
    guildId: string | null;
    ownerId: string;
    streamType: string;
}

export interface FriendsRow {
    key: string;
    userId: string;
    type: RelationshipType | 99;
    status: StatusType;
    isMobile: boolean;
    activities: unknown[];
    applicationStream: ApplicationStream | null;
    user: User | null;
    usernameLower: string | null;
    mutualGuildsLength: number;
    mutualGuilds: Guild[];
    nickname: string | null;
    spam: boolean;
    giftIntentType: GiftIntentType | undefined;
    ignoredUser: boolean;
    applicationId: string | undefined;
    isGameRelationship: boolean;
    comparator: [RelationshipType | 99, string | null];
}

export interface RelationshipCounts {
    [RelationshipType.FRIEND]: number;
    [RelationshipType.PENDING_INCOMING]: number;
    [RelationshipType.PENDING_OUTGOING]: number;
    [RelationshipType.BLOCKED]: number;
    99: number;
}

export interface FriendsRows {
    _rows: FriendsRow[];
    reset(): FriendsRows;
    clone(): FriendsRows;
    update(updater: (userId: string) => Partial<FriendsRow>): boolean;
    filter(section: FriendsSection, searchQuery?: string | null): FriendsRow[];
    getRelationshipCounts(): RelationshipCounts;
}

export interface FriendsState {
    fetching: boolean;
    section: FriendsSection;
    rows: FriendsRows;
}

export class FriendsStore extends FluxStore {
    getState(): FriendsState;
}
