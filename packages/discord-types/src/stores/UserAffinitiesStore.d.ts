import { FluxStore } from "..";

interface UserAffinity {
    otherUserId: string;
    userSegment: string;
    otherUserSegment: string;
    isFriend: boolean;
    dmProbability: number;
    dmRank: number;
    vcProbability: number;
    vcRank: number;
    serverMessageProbability: number;
    serverMessageRank: number;
    communicationProbability: number;
    communicationRank: number;
}

interface UserAffinitiesResponse {
    lastFetched: number;
    userAffinities: UserAffinity[];
}

export class UserAffinitiesStore extends FluxStore {
    compare(firstUserId: string, secondUserId: string): number;
    compareByDmProbability(firstUserId: string, secondUserId: string): number;
    getState(): UserAffinitiesResponse;
    getUserAffinities(): UserAffinity[];
    getUserAffinitiesMap(): Map<string, UserAffinity>;
    getUserAffinity(userId: string): UserAffinity;
    isFetching(): boolean;
    isHighlyAffinedVCUser(userId: string): boolean;
    shouldFetch(): boolean;
}
