/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface VoiceState {
    userId: string;
    guildId: string;
    sessionId: string;
    channelId?: string | null;
    mute: boolean;
    deaf: boolean;
    selfMute: boolean;
    selfDeaf: boolean;
    selfVideo: boolean;
    suppress: boolean;
    selfStream: boolean;
    requestToSpeakTimestamp: string | null;
    discoverable?: boolean;
    oldChannelId?: string | null;
}

export interface VoiceStateUpdateEvent {
    type: "VOICE_STATE_UPDATES";
    voiceStates: VoiceState[];
}

export type Event = VoiceStateUpdateEvent;
