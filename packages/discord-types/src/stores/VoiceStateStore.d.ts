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
}

export class VoiceStateStore extends FluxStore {
    getAllVoiceStates(): VoiceStates;
    getVoiceStateVersion(): number;

    getVoiceStates(guildId?: string | null): UserVoiceStateRecords;
    getVoiceStatesForChannel(channelId: string): UserVoiceStateRecords;
    getVideoVoiceStatesForChannel(channelId: string): UserVoiceStateRecords;

    getVoiceState(guildId: string | null, userId: string): VoiceState | undefined;
    getDiscoverableVoiceState(guildId: string | null, userId: string): VoiceState | null;
    getVoiceStateForChannel(channelId: string, userId?: string): VoiceState | undefined;
    getVoiceStateForUser(userId: string): VoiceState | undefined;
    getDiscoverableVoiceStateForUser(userId: string): VoiceState | undefined;
    getVoiceStateForSession(userId: string, sessionId?: string | null): VoiceState | null | undefined;

    getUserVoiceChannelId(guildId: string | null, userId: string): string | undefined;
    getCurrentClientVoiceChannelId(guildId: string | null): string | undefined;

    getUsersWithVideo(channelId: string): Set<string>;
    getVoicePlatformForChannel(channelId: string, guildId: string): string | undefined;

    isCurrentClientInVoiceChannel(): boolean;
    isInChannel(channelId: string, userId?: string): boolean;
    hasVideo(channelId: string): boolean;

    get userHasBeenMovedVersion(): number;
}
