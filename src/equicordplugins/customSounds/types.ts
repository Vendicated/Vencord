/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SoundType {
    name: string;
    id: string;
    seasonal?: string[];
}

export interface SoundOverride {
    enabled: boolean;
    selectedSound: string;
    volume: number;
    useFile: boolean;
    selectedFileId?: string;
}

export interface SoundPlayer {
    loop(): void;
    play(): void;
    pause(): void;
    stop(): void;
}

export const seasonalSounds = {
    "halloween_call_calling": "https://canary.discord.com/assets/0950a7ea4f1dd037870b.mp3",
    "winter_call_calling": "https://canary.discord.com/assets/7b945e7be3f86c5b7c82.mp3",
    "halloween_call_ringing": "https://canary.discord.com/assets/1b883b366ae11a303b82.mp3",
    "winter_call_ringing": "https://canary.discord.com/assets/e087eb83aaa4c43a44bc.mp3",
    "call_ringing_beat": "https://canary.discord.com/assets/3b3a2f5f29b9cb656efb.mp3",
    "call_ringing_snow_halation": "https://canary.discord.com/assets/99b1d8a6fe0b95e99827.mp3",
    "call_ringing_snowsgiving": "https://canary.discord.com/assets/54527e70cf0ddaeff76f.mp3",
    "halloween_deafen": "https://canary.discord.com/assets/c4aedda3b528df50221c.mp3",
    "winter_deafen": "https://canary.discord.com/assets/9bb77985afdb60704817.mp3",
    "halloween_disconnect": "https://canary.discord.com/assets/ca7d2e46cb5a16819aff.mp3",
    "winter_disconnect": "https://canary.discord.com/assets/ec5d85405877c27caeda.mp3",
    "halloween_message1": "https://canary.discord.com/assets/e386c839fb98675c6a79.mp3",
    "halloween_mute": "https://canary.discord.com/assets/ee7fdadf4c714eed6254.mp3",
    "winter_mute": "https://canary.discord.com/assets/6d7616e08466ab9f1c6d.mp3",
    "halloween_undeafen": "https://canary.discord.com/assets/045e5b9608df1607e0cf.mp3",
    "winter_undeafen": "https://canary.discord.com/assets/fa8da1499894ecac36c7.mp3",
    "halloween_unmute": "https://canary.discord.com/assets/260c581568eacca03f7e.mp3",
    "winter_unmute": "https://canary.discord.com/assets/9dbfb1c211e3815cd7b1.mp3",
    "halloween_user_join": "https://canary.discord.com/assets/80cf806f45467a5898cd.mp3",
    "winter_user_join": "https://canary.discord.com/assets/badc42c2a9063b4a962c.mp3",
    "halloween_user_leave": "https://canary.discord.com/assets/f407ad88a1dc40541769.mp3",
    "winter_user_leave": "https://canary.discord.com/assets/ec3d9eaea30b33e16da6.mp3"
} as const;

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
    { name: "Deafen", id: "deafen", seasonal: ["halloween_deafen", "winter_deafen"] },
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
    { name: "Undeafen", id: "undeafen", seasonal: ["halloween_undeafen", "winter_undeafen"] },
    { name: "Unmute", id: "unmute", seasonal: ["halloween_unmute", "winter_unmute"] },
    { name: "User Join", id: "user_join", seasonal: ["halloween_user_join", "winter_user_join"] },
    { name: "User Leave", id: "user_leave", seasonal: ["halloween_user_leave", "winter_user_leave"] },
    { name: "User Moved", id: "user_moved" },
    { name: "Vibing Wumpus", id: "vibing_wumpus" }
] as const;

export function makeEmptyOverride(): SoundOverride {
    return {
        enabled: false,
        selectedSound: "default",
        volume: 100,
        useFile: false,
        selectedFileId: undefined
    };
}
