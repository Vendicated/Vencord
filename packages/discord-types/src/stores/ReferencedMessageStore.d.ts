import { FluxStore, Message } from "..";

export interface ReferencedMessage {
    state: number;
    message?: Message;
}

export class ReferencedMessageStore extends FluxStore {
    getMessageByReference(reference: Message["messageReference"]): { message: Message; } | undefined;
    getMessage(channelId: string, messageId: string): ReferencedMessage;
    getReplyIdsForChannel(channelId: string | null | undefined): Set<string>;
}
