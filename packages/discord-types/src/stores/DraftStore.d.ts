import { FluxStore } from "..";
export interface DraftObject {
    channelId: string;
    timestamp: number;
    draft: string;
}

export interface DraftState {
    [userId: string]: {
        [channelId: string]: {
            [key in DraftType]?: Omit<DraftObject, "channelId">;
        } | undefined;
    } | undefined;
}


export enum DraftType {
    ChannelMessage,
    ThreadSettings,
    FirstThreadMessage,
    ApplicationLauncherCommand,
    Poll,
    SlashCommand,
}

export class DraftStore extends FluxStore {
    getDraft(channelId: string, type: DraftType): string;
    getRecentlyEditedDrafts(type: DraftType): DraftObject[];
    getState(): DraftState;
    getThreadDraftWithParentMessageId?(arg: any): any;
    getThreadSettings(channelId: string): any | null;
}
