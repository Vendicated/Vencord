import { Channel, FluxStore } from "..";

export interface IncomingCall {
    channel: Channel;
    senderId: string;
    /** popout position in px */
    x: number;
    y: number;
}

export class IncomingCallStore extends FluxStore {
    getIncomingCalls(): IncomingCall[];
    getIncomingCallChannelIds(): Set<string>;
    getFirstIncomingCallId(): string | null;
    hasIncomingCalls(): boolean;
}
