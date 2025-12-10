import { FluxStore } from "..";

export enum DraftType {
    ChannelMessage = 0,
    ThreadSettings = 1,
    FirstThreadMessage = 2,
    ApplicationLauncherCommand = 3,
    Poll = 4,
    SlashCommand = 5,
    ForwardContextMessage = 6
}

export interface Draft {
    timestamp: number;
    draft: string;
}

export interface ThreadSettingsDraft {
    timestamp: number;
    parentMessageId?: string;
    name?: string;
    isPrivate?: boolean;
    parentChannelId?: string;
    location?: string;
}

export type ChannelDrafts = {
    [DraftType.ThreadSettings]: ThreadSettingsDraft;
} & {
    [key in Exclude<DraftType, DraftType.ThreadSettings>]: Draft;
};

export type UserDrafts = Partial<Record<string, ChannelDrafts>>;
export type DraftState = Partial<Record<string, UserDrafts>>;

export class DraftStore extends FluxStore {
    getState(): DraftState;
    getRecentlyEditedDrafts(type: DraftType): Array<Draft & { channelId: string; }>;
    getDraft(channelId: string, type: DraftType): string;

    getThreadSettings(channelId: string): ThreadSettingsDraft | null | undefined;
    getThreadDraftWithParentMessageId(parentMessageId: string): ThreadSettingsDraft | null | undefined;
}
