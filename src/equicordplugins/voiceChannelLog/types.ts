/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { User } from "@vencord/discord-types";

export type LogEventType =
    | "join"
    | "leave"
    | "move"
    | "soundboard"
    | "server_mute"
    | "server_deafen"
    | "self_video"
    | "self_stream"
    | "activity"
    | "activity_stop";

export interface Emoji {
    name: string;
    id?: string;
    animated: boolean;
}

export interface VoiceChannelLogEntry {
    type: LogEventType;
    userId: string;
    channelId: string;
    timestamp: Date;
    oldChannelId?: string | null;
    newChannelId?: string | null;
    soundId?: string;
    emoji?: Emoji;
    enabled?: boolean;
    activityName?: string;
    applicationId?: string;
}

export interface VoiceState {
    guildId?: string;
    channelId?: string;
    oldChannelId?: string;
    user: User;
    userId: string;
    mute: boolean;
    deaf: boolean;
    selfMute: boolean;
    selfDeaf: boolean;
    selfVideo: boolean;
    selfStream?: boolean;
}

export interface SoundEvent {
    type: "VOICE_CHANNEL_EFFECT_SEND";
    emoji?: Emoji;
    channelId: string;
    userId: string;
    soundId?: string;
}

export interface EmbeddedActivityEvent {
    applicationId: string;
    location?: {
        channel_id?: string;
        guild_id?: string;
    };
    participants?: Array<{
        user_id: string;
        session_id: string;
    }>;
}

export interface PreviousVoiceState {
    mute: boolean;
    deaf: boolean;
    selfVideo: boolean;
    selfStream: boolean;
    channelId?: string;
}
