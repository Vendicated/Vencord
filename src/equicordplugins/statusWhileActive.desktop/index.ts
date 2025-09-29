/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { VoiceState } from "@vencord/discord-types";
import { PresenceStore, UserStore, VoiceStateStore } from "@webpack/common";

let savedStatus: string | null = null;
const StatusSettings = getUserSettingLazy("status", "status");
const settings = definePluginSettings({
    trigger: {
        type: OptionType.SELECT,
        description: "When to change your status",
        options: [
            {
                label: "While playing a game",
                value: "game",
                default: true,
            },
            {
                label: "While in a voice channel",
                value: "vc",
            },
            {
                label: "While playing or in a voice channel",
                value: "either",
            },
        ]
    },
    statusToSet: {
        type: OptionType.SELECT,
        description: "Status to set",
        options: [
            {
                label: "Online",
                value: "online",
            },
            {
                label: "Idle",
                value: "idle",
            },
            {
                label: "Do Not Disturb",
                value: "dnd",
                default: true,
            },
            {
                label: "Invisible",
                value: "invisible",
            }
        ]
    }
});

function setStatus(preq, status) {
    if (preq) {
        if (status !== settings.store.statusToSet) {
            savedStatus = status;
            StatusSettings?.updateSetting(settings.store.statusToSet);
        }
    } else if (savedStatus && savedStatus !== settings.store.statusToSet) {
        StatusSettings?.updateSetting(savedStatus);
        savedStatus = null;
    }
}

migratePluginSettings("StatusWhileActive", "StatusWhilePlaying");
export default definePlugin({
    name: "StatusWhileActive",
    description: "Automatically updates your online status when playing games or in a voice channel.",
    authors: [Devs.thororen, EquicordDevs.smuki],
    settings,
    flux: {
        RUNNING_GAMES_CHANGE({ games }) {
            const { trigger } = settings.store;
            if (trigger === "vc") return;

            const userId = UserStore.getCurrentUser().id;
            const status = PresenceStore.getStatus(userId);

            setStatus(games.length > 0, status);
        },
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const { trigger } = settings.store;
            if (trigger === "game") return;

            const userId = UserStore.getCurrentUser().id;
            const myState = voiceStates.find(state => state.userId === userId);
            if (!myState) return;

            const status = PresenceStore.getStatus(userId);
            const inVoiceChannel = !!VoiceStateStore.getVoiceStateForUser(userId)?.channelId;

            setStatus(inVoiceChannel, status);
        },
        VOICE_CHANNEL_STATUS_UPDATE() {
            const { trigger } = settings.store;
            if (trigger === "game") return;

            const userId = UserStore.getCurrentUser().id;
            const status = PresenceStore.getStatus(userId);
            const inVoiceChannel = !!VoiceStateStore.getVoiceStateForUser(userId)?.channelId;

            setStatus(inVoiceChannel, status);
        }
    },
});
