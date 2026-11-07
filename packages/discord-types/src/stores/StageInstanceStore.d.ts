import { FluxStore } from "..";
import { StageInstance } from "./InviteStore";

export class StageInstanceStore extends FluxStore {
    getStageInstanceByChannel(channelId: string | null | undefined): StageInstance | undefined;
    isLive(channelId: string | null | undefined): boolean;
    isPublic(channelId: string | null | undefined): boolean;
    /** keyed by channel id */
    getStageInstancesByGuild(guildId: string | null | undefined): Record<string, StageInstance>;
    getAllStageInstances(): StageInstance[];
}
