import { Channel, FluxStore } from "..";

export class ChannelStatusStore extends FluxStore {
    /** only set for guild voice channels */
    getChannelStatus(channel: Channel | null | undefined): string | null | undefined;
    hasRequestedStatuses(guildId: string): boolean;
}
