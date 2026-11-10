import { FluxStore, OnlineStatus } from "..";

/** 0 active now, 1 game, 2 alphabetical */
export type FriendGroupingMode = 0 | 1 | 2;

/** 0 active now, 1 game, 2 letter, 3 online, 4 offline */
export type FriendSectionType = 0 | 1 | 2 | 3 | 4;

export interface FriendRowState {
    groupingMode: FriendGroupingMode;
    voiceGroupingEnabled: boolean;
}

export interface FriendRow {
    type: 0;
    userId: string;
    name: string;
    status: OnlineStatus;
    gameAppId: string | null;
    gameName: string | null;
    gameAssetUrl: string | null;
    gameActivityIndex: number | null;
    isListening: boolean;
    voiceChannelId: string | null;
}

export interface FriendVoiceGroupRow {
    type: 1;
    key: string;
    channelId: string;
    rows: FriendRow[];
    /** voice channel members that aren't shown as rows, excluding the current user */
    extraMemberCount: number;
}

export interface FriendRowSection {
    key: string;
    type: FriendSectionType;
    label: string | undefined;
    gameAppId: string | undefined;
    gameAssetUrl: string | undefined;
    rows: (FriendVoiceGroupRow | FriendRow)[];
}

export class FriendRowStore extends FluxStore {
    getState(): FriendRowState;
    getGroupingMode(): FriendGroupingMode;
    isVoiceGroupingEnabled(): boolean;
    getSections(): readonly FriendRowSection[];
    getRow(userId: string): FriendRow | undefined;
}
