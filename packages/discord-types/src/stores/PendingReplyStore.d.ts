import { Channel, Message } from "../common";
import { FluxStore } from "./FluxStore";

export interface PendingReply {
    channel: Channel;
    message: Message;
    shouldMention: boolean;
    showMentionToggle: boolean;
}

export class PendingReplyStore extends FluxStore {
    getPendingReply(channelId: string): PendingReply | undefined;
    /** Discord doesn't use this method. Also seems to always return undefined */
    getPendingReplyActionSource(channelId: string): unknown;
}
