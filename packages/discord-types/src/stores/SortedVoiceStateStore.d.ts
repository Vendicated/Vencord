import { Channel, FluxStore, GuildMember, User } from "..";
import { VoiceState } from "./VoiceStateStore";

export interface SortedVoiceStateEntry {
    voiceState: VoiceState;
    user: User;
    member: GuildMember | null;
    comparator: string;
    nick: string | undefined;
    connectedOn: number;
    _isPlaceholder?: true;
}

export interface SortedGuildVoiceStates {
    guildId: string;
    getUserIds(): MapIterator<string>;
    /** keyed by channel id */
    getVoiceStates(): Record<string, SortedVoiceStateEntry[]>;
    getVoiceStatesForChannel(channelId: string): SortedVoiceStateEntry[];
    countVoiceStatesForChannel(channelId: string): number;
    getVersion(): number;
}

export class SortedVoiceStateStore extends FluxStore {
    /** keyed by channel id */
    getVoiceStates(guildId?: string | null): Record<string, SortedVoiceStateEntry[]>;
    /** keyed by guild id */
    getAllVoiceStates(): Record<string, SortedGuildVoiceStates>;
    getVoiceStatesForChannel(channel: Channel): SortedVoiceStateEntry[];
    getVoiceStatesForChannelAlt(channelId: string, guildId?: string | null): SortedVoiceStateEntry[];
    countVoiceStatesForChannel(channelId: string): number;
    getVoiceStateVersion(guildId?: string | null): number;
}
