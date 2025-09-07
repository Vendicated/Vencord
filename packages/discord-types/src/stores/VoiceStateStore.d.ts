import { DiscordRecord } from "../common";
import { FluxStore } from "./FluxStore";

export type UserVoiceStateRecords = Record<string, VoiceState>;
export type VoiceStates = Record<string, UserVoiceStateRecords>;

export interface VoiceState extends DiscordRecord {
    userId: string;
    channelId: string | null | undefined;
    sessionId: string | null | undefined;
    mute: boolean;
    deaf: boolean;
    selfMute: boolean;
    selfDeaf: boolean;
    selfVideo: boolean;
    selfStream: boolean | undefined;
    suppress: boolean;
    requestToSpeakTimestamp: string | null | undefined;
    discoverable: boolean;

    isVoiceMuted(): boolean;
    isVoiceDeafened(): boolean;

    oldChannelId?: string;
    guildId?: string;
}

export class VoiceStateStore extends FluxStore {
    getAllVoiceStates(): VoiceStates;

    getVoiceStates(guildId?: string | null): UserVoiceStateRecords;
    getVoiceStatesForChannel(channelId: string): UserVoiceStateRecords;
    getVideoVoiceStatesForChannel(channelId: string): UserVoiceStateRecords;

    getVoiceState(guildId: string | null, userId: string): VoiceState | undefined;
    getUserVoiceChannelId(guildId: string | null, userId: string): string | undefined;
    getVoiceStateForChannel(channelId: string, userId?: string): VoiceState | undefined;
    getVoiceStateForUser(userId: string): VoiceState | undefined;

    getCurrentClientVoiceChannelId(guildId: string | null): string | undefined;
    isCurrentClientInVoiceChannel(): boolean;

    isInChannel(channelId: string, userId?: string): boolean;
    hasVideo(channelId: string): boolean;
}
