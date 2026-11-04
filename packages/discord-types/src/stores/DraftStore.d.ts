import { Command, FluxStore } from "..";
import { DraftType } from "../../enums";

export interface Draft {
    timestamp: number;
    draft: string;
    command?: Command;
}

export interface ThreadSettingsDraft {
    timestamp: number;
    parentMessageId?: string;
    name?: string;
    isPrivate?: boolean;
    parentChannelId?: string;
    location?: string;
}

export interface ScheduledMessageDraft {
    timestamp: number;
    [key: string]: unknown;
}

export type ChannelDrafts = {
    [DraftType.ThreadSettings]: ThreadSettingsDraft;
    [DraftType.ScheduledMessage]: ScheduledMessageDraft;
} & {
    [key in Exclude<DraftType, DraftType.ThreadSettings | DraftType.ScheduledMessage>]: Draft;
};

export type UserDrafts = Partial<Record<string, ChannelDrafts>>;
export type DraftState = Partial<Record<string, UserDrafts>>;

export class DraftStore extends FluxStore {
    getState(): DraftState;
    getRecentlyEditedDrafts(type: DraftType): Array<Draft & { channelId: string; }>;
    getDraft(channelId: string, type: DraftType): string;
    getDraftCommand(channelId: string, type: DraftType): Command | undefined;
    getScheduledMessage(channelId: string): ScheduledMessageDraft | undefined;

    getThreadSettings(channelId: string): ThreadSettingsDraft | null | undefined;
    getThreadDraftWithParentMessageId(parentMessageId: string): ThreadSettingsDraft | null | undefined;
}
