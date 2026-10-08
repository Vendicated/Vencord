import { FluxStore } from "..";

export class MessageRequestStore extends FluxStore {
    getMessageRequestChannelIds(): Set<string>;
    getMessageRequestsCount(): number;
    isAcceptedOptimistic(channelId: string): boolean;
    isMessageRequest(channelId: string): boolean;
    isReady(): boolean;
}
