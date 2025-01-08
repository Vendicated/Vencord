/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SoundType {
    name: string;
    id: string;
    seasonal?: string[];
}

export interface SoundOverride {
    enabled: boolean;
    url: string;
    useFile: boolean;
    volume: number;
    selectedSound: string;
}

export interface SoundPlayer {
    loop(): void;
    play(): void;
    pause(): void;
    stop(): void;
}

export const soundTypes: readonly SoundType[] = [
    { name: "Activity End", id: "activity_end" },
    { name: "Activity Launch", id: "activity_launch" },
    { name: "Activity User Join", id: "activity_user_join" },
    { name: "Activity User Left", id: "activity_user_left" },
    { name: "ASMR Message", id: "asmr_message1" },
    { name: "Bit Message", id: "bit_message1" },
    { name: "Bop Message", id: "bop_message1" },
    { name: "Call Calling", id: "call_calling", seasonal: ["halloween_call_calling", "winter_call_calling"] },
    {
        name: "Call Ringing",
        id: "call_ringing",
        seasonal: [
            "halloween_call_ringing",
            "winter_call_ringing",
            "call_ringing_beat",
            "call_ringing_snow_halation",
            "call_ringing_snowsgiving"
        ]
    },
    { name: "Clip Error", id: "clip_error" },
    { name: "Clip Save", id: "clip_save" },
    { name: "DDR Down", id: "ddr-down" },
    { name: "DDR Left", id: "ddr-left" },
    { name: "DDR Right", id: "ddr-right" },
    { name: "DDR Up", id: "ddr-up" },
    { name: "Deafen", id: "deafen", seasonal: ["halloween_deafen", "halloween_defean", "winter_deafen"] },
    { name: "Discodo", id: "discodo" },
    { name: "Disconnect", id: "disconnect", seasonal: ["halloween_disconnect", "winter_disconnect"] },
    { name: "Ducky Message", id: "ducky_message1" },
    { name: "Hang Status Select", id: "hang_status_select" },
    { name: "Highfive Clap", id: "highfive_clap" },
    { name: "Highfive Whistle", id: "highfive_whistle" },
    { name: "Human Man", id: "human_man" },
    { name: "LoFi Message", id: "lofi_message1" },
    { name: "Mention 1", id: "mention1" },
    { name: "Mention 2", id: "mention2" },
    { name: "Mention 3", id: "mention3" },
    { name: "Message 1", id: "message1", seasonal: ["halloween_message1"] },
    { name: "Message 2", id: "message2" },
    { name: "Message 3", id: "message3" },
    { name: "Mute", id: "mute", seasonal: ["halloween_mute", "winter_mute"] },
    { name: "Overlay Unlock", id: "overlayunlock" },
    { name: "Poggermode Achievement", id: "poggermode_achievement_unlock" },
    { name: "Poggermode Applause", id: "poggermode_applause" },
    { name: "Poggermode Enabled", id: "poggermode_enabled" },
    { name: "Poggermode Message", id: "poggermode_message_send" },
    { name: "PTT Start", id: "ptt_start" },
    { name: "PTT Stop", id: "ptt_stop" },
    { name: "Reconnect", id: "reconnect" },
    { name: "Robot Man", id: "robot_man" },
    { name: "Stage Waiting", id: "stage_waiting" },
    { name: "Stream Ended", id: "stream_ended" },
    { name: "Stream Started", id: "stream_started" },
    { name: "Stream User Joined", id: "stream_user_joined" },
    { name: "Stream User Left", id: "stream_user_left" },
    { name: "Success", id: "success" },
    { name: "Undeafen", id: "undeafen", seasonal: ["halloween_undeafen", "halloween_undefean", "winter_undeafen"] },
    { name: "Unmute", id: "unmute", seasonal: ["halloween_unmute", "winter_unmute"] },
    { name: "User Join", id: "user_join", seasonal: ["halloween_user_join", "winter_user_join"] },
    { name: "User Leave", id: "user_leave", seasonal: ["halloween_user_leave", "winter_user_leave"] },
    { name: "User Moved", id: "user_moved" },
    { name: "Vibing Wumpus", id: "vibing_wumpus" }
] as const;

export function makeEmptyOverride(): SoundOverride {
    return {
        enabled: false,
        useFile: false,
        url: "",
        volume: 100,
        selectedSound: "default"
    };
}
