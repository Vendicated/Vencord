import { Activity, FluxStore, Guild, User } from "..";
import { GiftIntentType, RelationshipType } from "../../enums";

export type FriendsSection = "ADD_FRIEND" | "ALL" | "ONLINE" | "PENDING" | "PENDING_IGNORED" | "SPAM" | "SUGGESTIONS";

export type StatusType = "online" | "offline" | "idle" | "dnd" | "invisible" | "streaming" | "unknown";

export interface ApplicationStream {
    channelId: string;
    guildId: string | null;
    ownerId: string;
    streamType: string;
}

export interface FriendsRow {
    key: string;
    userId: string;
    /**
     * 99 means contact based friend suggestions from FriendSuggestionStore,
     * shown in SUGGESTIONS tab. different from RelationshipType.SUGGESTION
     * which is for implicit suggestions in RelationshipStore
     */
    type: RelationshipType | 99;
    status: StatusType;
    isMobile: boolean;
    activities: Activity[];
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
    [RelationshipType.INCOMING_REQUEST]: number;
    [RelationshipType.OUTGOING_REQUEST]: number;
    [RelationshipType.BLOCKED]: number;
    /** contact based friend suggestions from FriendSuggestionStore */
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
