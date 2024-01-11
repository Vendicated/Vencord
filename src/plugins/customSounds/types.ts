/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SoundType {
    name: string;
    id: string;
}

export interface SoundOverride {
    enabled: boolean;
    useFile: boolean;
    url: string;
    volume: number;
}

export interface SoundPlayer {
    loop(): void;
    play(): void;
    pause(): void;
    stop(): void;
}

export const soundTypes: readonly SoundType[] = [
    { name: "Message", id: "message1" },
    { name: "Defean", id: "deafen" },
    { name: "Undefean", id: "undeafen" },
    { name: "Mute", id: "mute" },
    { name: "Unmute", id: "unmute" },
    { name: "Voice Disconnected", id: "disconnect" },
    { name: "PTT Activate", id: "ptt_start" },
    { name: "PTT Deactive", id: "ptt_stop" },
    { name: "User Join", id: "user_join" },
    { name: "User Leave", id: "user_leave" },
    { name: "User Moved", id: "user_moved" },
    { name: "Outgoing Ring", id: "call_calling" },
    { name: "Incoming Ring", id: "call_ringing" },
    { name: "Stream Started", id: "stream_started" },
    { name: "Stream Ended", id: "stream_ended" },
    { name: "Viewer Join", id: "stream_user_joined" },
    { name: "Viewer Leave", id: "stream_user_left" },
    { name: "Activity Start", id: "activity_launch" },
    { name: "Activity End", id: "activity_end" },
    { name: "Activity User Join", id: "activity_user_join" },
    { name: "Activity User Leave", id: "activity_user_left" },
    { name: "Invited to Speak", id: "reconnect" }
] as const;

export function makeEmptyOverride(): SoundOverride {
    return {
        enabled: false,
        useFile: false,
        url: "",
        volume: 100
    };
}
