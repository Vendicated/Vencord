import { FluxStore } from "..";

export interface Call {
    channelId: string;
    messageId: string | null;
    region: string | null;
    ringing: string[];
    unavailable: boolean;
    regionUpdated: boolean;
}

export interface CallStoreState {
    calls: Record<string, Call>;
    enqueuedRings: Record<string, string[]>;
}

export class CallStore extends FluxStore {
    getCall(channelId: string): Call;
    getCalls(): Call[];
    getMessageId(channelId: string): string | null;
    isCallActive(channelId: string, messageId?: string): boolean;
    isCallUnavailable(channelId: string): boolean;
    getInternalState(): CallStoreState;
}
