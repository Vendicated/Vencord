import { MessageJSON, FluxStore, Message } from "..";

export class MessageStore extends FluxStore {
    getMessage(channelId: string, messageId: string): Message;
    /** @returns This return object is fucking huge; I'll type it later. */
    getMessages(channelId: string): unknown;
    getRawMessages(channelId: string): Record<string | number, MessageJSON>;
    hasCurrentUserSentMessage(channelId: string): boolean;
    hasPresent(channelId: string): boolean;
    isLoadingMessages(channelId: string): boolean;
    jumpedMessageId(channelId: string): string | undefined;
    whenReady(channelId: string, callback: () => void): void;
}
