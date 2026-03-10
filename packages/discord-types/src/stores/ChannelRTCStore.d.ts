import { FluxStore, User, VoiceState } from "..";
import { ParticipantType, RTCPlatform } from "../../enums";

export type RTCLayout = "normal" | "minimum" | "no-chat" | "full-screen" | "haven";
export type RTCMode = "video" | "voice";
export type RTCLayoutContext = "OVERLAY" | "APP" | "POPOUT" | "CALL_TILE_POPOUT";
export type ParticipantFilterType = "VIDEO" | "STREAM" | "FILTERED" | "SPEAKING" | "ACTIVITY" | "NOT_POPPED_OUT";

export interface StreamResolution {
    height: number;
    width: number;
}

export interface Stream {
    channelId: string;
    guildId: string | null;
    ownerId: string;
    streamType: string;
}

export interface BaseParticipant {
    id: string;
    type: ParticipantType;
    isPoppedOut?: boolean;
}

export interface UserParticipant extends BaseParticipant {
    type: ParticipantType.USER;
    user: User;
    voiceState: VoiceState | null;
    voicePlatform: RTCPlatform | null;
    speaking: boolean;
    voiceDb: number;
    latched: boolean;
    lastSpoke: number;
    soundsharing: boolean;
    ringing: boolean;
    userNick: string;
    // TODO: type
    userAvatarDecoration: any | null;
    localVideoDisabled: boolean;
    userVideo?: boolean;
    streamId?: string;
}

export interface StreamParticipant extends BaseParticipant {
    type: ParticipantType.STREAM | ParticipantType.HIDDEN_STREAM;
    user: User;
    userNick: string;
    userVideo: boolean;
    stream: Stream;
    maxResolution?: StreamResolution;
    maxFrameRate?: number;
    streamId?: string;
}

export interface ActivityParticipant extends BaseParticipant {
    type: ParticipantType.ACTIVITY;
    applicationId: string;
    activityType: number;
    activityUrl: string;
    participants: string[];
    guildId: string | null;
    sortKey: string;
}

export type Participant = UserParticipant | StreamParticipant | ActivityParticipant;

export interface SelectedParticipantStats {
    view_mode_grid_duration_ms?: number;
    view_mode_focus_duration_ms?: number;
    view_mode_toggle_count?: number;
}

export interface ChannelRTCState {
    voiceParticipantsHidden: Record<string, boolean>;
}

export class ChannelRTCStore extends FluxStore {
    getActivityParticipants(channelId: string): ActivityParticipant[];
    getAllChatOpen(): Record<string, boolean>;
    getChatOpen(channelId: string): boolean;
    getFilteredParticipants(channelId: string): Participant[];
    getGuildRingingUsers(channelId: string): Set<string>;
    getLayout(channelId: string, context?: RTCLayoutContext): RTCLayout;
    getMode(channelId: string): RTCMode;
    getParticipant(channelId: string, participantId: string): Participant | null;
    getParticipants(channelId: string): Participant[];
    getParticipantsListOpen(channelId: string): boolean;
    getParticipantsOpen(channelId: string): boolean;
    getParticipantsVersion(channelId: string): number;
    getSelectedParticipant(channelId: string): Participant | null;
    getSelectedParticipantId(channelId: string): string | null;
    getSelectedParticipantStats(channelId: string): SelectedParticipantStats;
    getSpeakingParticipants(channelId: string): UserParticipant[];
    getStageStreamSize(channelId: string): StreamResolution | undefined;
    getStageVideoLimitBoostUpsellDismissed(channelId: string): boolean | undefined;
    getState(): ChannelRTCState;
    getStreamParticipants(channelId: string): StreamParticipant[];
    getUserParticipantCount(channelId: string): number;
    getVideoParticipants(channelId: string): UserParticipant[];
    getVoiceParticipantsHidden(channelId: string): boolean;
    isFullscreenInContext(): boolean;
    isParticipantPoppedOut(channelId: string, participantId: string): boolean;
}
