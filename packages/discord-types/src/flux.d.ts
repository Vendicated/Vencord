import { GuildMemberFlags } from "../enums";
import { VoiceState } from "./stores";
import { FluxStore } from "./stores/FluxStore";

export interface PassiveUpdateState {
    type: string;
    guildId: string;
    members?: ({
        user: {
            avatar: string | null;
            communication_disabled_until: string | null;
            deaf: boolean;
            flags: GuildMemberFlags;
            joined_at: string;
            mute: boolean;
            nick: string;
            pending: boolean;
            premium_since: string | null;
        };
        roles: string[];
        premium_since: string | null;
        pending: boolean;
        nick: string | null;
        mute: boolean;
        joined_at: string;
        flags: GuildMemberFlags;
        deaf: boolean;
        communication_disabled_until: string | null;
        avatar: string | null;
    })[];
    channels: ({
        lastPinTimestamp?: string;
        lastMessageId: string;
        id: string;
    })[];
    voiceStates?: VoiceState[];
}


export class FluxEmitter {
    constructor();

    changeSentinel: number;
    changedStores: Set<FluxStore>;
    isBatchEmitting: boolean;
    isDispatching: boolean;
    isPaused: boolean;
    pauseTimer: NodeJS.Timeout | null;
    reactChangedStores: Set<FluxStore>;

    batched(batch: (...args: any[]) => void): void;
    destroy(): void;
    emit(): void;
    emitNonReactOnce(): void;
    emitReactOnce(): void;
    getChangeSentinel(): number;
    getIsPaused(): boolean;
    injectBatchEmitChanges(batch: (...args: any[]) => void): void;
    markChanged(store: FluxStore): void;
    pause(): void;
    resume(): void;
}

export interface Flux {
    Store: typeof FluxStore;
    Emitter: FluxEmitter;
}
