import { FluxStore } from "..";

export type RTCConnectionState =
    | "DISCONNECTED"
    | "AWAITING_ENDPOINT"
    | "AUTHENTICATING"
    | "CONNECTING"
    | "RTC_DISCONNECTED"
    | "RTC_CONNECTING"
    | "RTC_CONNECTED"
    | "NO_ROUTE"
    | "ICE_CHECKING"
    | "DTLS_CONNECTING";

export type RTCConnectionQuality = "unknown" | "bad" | "average" | "fine";

export interface LastRTCConnectionState {
    duration: number | null;
    mediaSessionId: string | null;
    rtcConnectionId: string | null;
    wasEverMultiParticipant: boolean;
    wasEverRtcConnected: boolean;
    // TODO: type
    voiceStateAnalytics: any;
    channelId: string;
}

export interface RTCConnectionPacketStats {
    inbound: number;
    outbound: number;
    lost: number;
}

export interface VoiceStateStats {
    max_voice_state_count: number;
}

export interface SecureFramesState {
    state: string;
}

export interface SecureFramesRosterMapEntry {
    pendingVerifyState: number;
    verifiedState: number;
}

export class RTCConnectionStore extends FluxStore {
    // TODO: type
    getRTCConnection(): any | null;
    getState(): RTCConnectionState;
    isConnected(): boolean;
    isDisconnected(): boolean;
    getRemoteDisconnectVoiceChannelId(): string | null;
    getLastSessionVoiceChannelId(): string | null;
    setLastSessionVoiceChannelId(channelId: string | null): void;
    getGuildId(): string | undefined;
    getChannelId(): string | undefined;
    getHostname(): string;
    getQuality(): RTCConnectionQuality;
    getPings(): number[];
    getAveragePing(): number;
    getLastPing(): number | undefined;
    getOutboundLossRate(): number | undefined;
    getMediaSessionId(): string | undefined;
    getRTCConnectionId(): string | undefined;
    getDuration(): number | undefined;
    getLastRTCConnectionState(): LastRTCConnectionState | null;
    getVoiceFilterSpeakingDurationMs(): number | undefined;
    getPacketStats(): RTCConnectionPacketStats | undefined;
    getVoiceStateStats(): VoiceStateStats | undefined;
    // TODO: finish typing
    getUserVoiceSettingsStats(userId: string): any | undefined;
    getWasEverMultiParticipant(): boolean;
    getWasEverRtcConnected(): boolean;
    getUserIds(): string[] | undefined;
    getJoinVoiceId(): string | null;
    isUserConnected(userId: string): boolean | undefined;
    getSecureFramesState(): SecureFramesState | undefined;
    getSecureFramesRosterMapEntry(oderId: string): SecureFramesRosterMapEntry | undefined;
    getLastNonZeroRemoteVideoSinkWantsTime(): number | null;
    getWasMoved(): boolean;
}
