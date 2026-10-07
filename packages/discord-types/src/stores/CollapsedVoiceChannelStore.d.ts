import { FluxStore } from "..";

export class CollapsedVoiceChannelStore extends FluxStore {
    getCollapsed(): Record<string, boolean>;
    isCollapsed(channelId: string): boolean;
}
