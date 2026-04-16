/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { VoiceState } from "@vencord/discord-types";
import { UserStore, VoiceStateStore } from "@webpack/common";

let savedStatus: string | null;

const StatusSettings = getUserSettingLazy<string>("status", "status")!;

const settings = definePluginSettings({
    statusToSet: {
        type: OptionType.SELECT,
        description: "Status to set while in a voice channel.",
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
                default: true
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

export default definePlugin({
    name: "StatusWhileActive",
    description: "Automatically updates your online status when in a voice channel.",
    authors: [EquicordDevs.smuki],
    settings,
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const userId = UserStore.getCurrentUser().id;
            const myState = voiceStates.find(state => state.userId === userId);
            if (!myState) return;

            const status = StatusSettings.getSetting();
            const inVoiceChannel = !!VoiceStateStore.getVoiceStateForUser(userId)?.channelId;

            setStatus(inVoiceChannel, status);
        },
        VOICE_CHANNEL_STATUS_UPDATE() {
            const userId = UserStore.getCurrentUser().id;
            const status = StatusSettings.getSetting();
            const inVoiceChannel = !!VoiceStateStore.getVoiceStateForUser(userId)?.channelId;

            setStatus(inVoiceChannel, status);
        }
    },
});
