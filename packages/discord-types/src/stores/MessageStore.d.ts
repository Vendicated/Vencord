import { FluxStore, Message } from "..";

export type JumpType = "ANIMATED" | "INSTANT";

export interface MessageCache {
    _messages: Message[];
    _map: Record<string, Message>;
    _wasAtEdge: boolean;
    _isCacheBefore: boolean;
}

export interface ChannelMessages {
    channelId: string;
    ready: boolean;
    cached: boolean;
    jumpType: JumpType;
    jumpTargetId: string | null;
    jumpTargetOffset: number;
    jumpSequenceId: number;
    jumped: boolean;
    jumpedToPresent: boolean;
    jumpFlash: boolean;
    jumpReturnTargetId: string | null;
    focusTargetId: string | null;
    focusSequenceId: number;
    initialScrollSequenceId: number;
    hasMoreBefore: boolean;
    hasMoreAfter: boolean;
    loadingMore: boolean;
    revealedMessageId: string | null;
    hasFetched: boolean;
    error: boolean;
    _array: Message[];
    _before: MessageCache;
    _after: MessageCache;
    _map: Record<string, Message>;
}

export class MessageStore extends FluxStore {
    focusedMessageId(channelId: string): string | undefined;
    getLastChatCommandMessage(channelId: string): Message | undefined;
    getLastEditableMessage(channelId: string): Message | undefined;
    getLastMessage(channelId: string): Message | undefined;
    getLastNonCurrentUserMessage(channelId: string): Message | undefined;
    getMessage(channelId: string, messageId: string): Message;
    /** @see {@link ChannelMessages} */
    getMessages(channelId: string): ChannelMessages;
    hasCurrentUserSentMessage(channelId: string): boolean;
    hasCurrentUserSentMessageSinceAppStart(channelId: string): boolean;
    hasPresent(channelId: string): boolean;
    isLoadingMessages(channelId: string): boolean;
    isReady(channelId: string): boolean;
    jumpedMessageId(channelId: string): string | undefined;
    whenReady(channelId: string, callback: () => void): void;
}
