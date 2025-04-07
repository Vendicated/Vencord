/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode, findByProps } from "@webpack";
import { ChannelStore, SelectedChannelStore, UserStore } from "@webpack/common";
import { VoiceState } from "@webpack/types";

const settings = definePluginSettings({
    instantScreenShare: {
        description: "Instantly screenshare screen 1 when joining a voice channel",
        type: OptionType.BOOLEAN,
        default: false
    }
});

let hasStreamed = false;

async function startStream() {
    const startStream = findByCode('type:"STREAM_START"');
    const mediaEngine = findByProps("getMediaEngine").getMediaEngine();
    const getDesktopSources = findByCode("desktop sources");
    const selected = SelectedChannelStore.getVoiceChannelId();
    if (!selected) return;
    const channel = ChannelStore.getChannel(selected);
    const sources = await getDesktopSources(mediaEngine, ["screen"], null);
    if (!sources || sources.length === 0) return;
    const source = sources[0];
    startStream(channel.guild_id, selected, {
        "pid": null,
        "sourceId": source.id,
        "sourceName": source.name,
        "audioSourceId": null,
        "sound": true,
        "previewDisabled": false
    });
}

export default definePlugin({
    name: "ScreenshareKeybind",
    description: "Adds a keybind to instantly screenshare your first screen",
    authors: [Devs.HAHALOSAH],
    settings,
    patches: [
        {
            find: "DISCONNECT_FROM_VOICE_CHANNEL]",
            replacement: {
                match: /\[\i\.\i\.DISCONNECT_FROM_VOICE_CHANNEL/,
                replace: "SHARE_ENTIRE_SCREEN:{onTrigger:$self.trigger,keyEvents:{keyUp:!1,keyDown:!0}},$&"
            },
        },
        {
            find: "keybindActionTypes()",
            replacement: {
                match: /=\[(\{value:\i\.\i\.UNASSIGNED)/,
                replace: "=[{value:'SHARE_ENTIRE_SCREEN',label:'Share Entire Screen'},$1"
            }
        }
    ],
    flux: {
        async VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!settings.store.instantScreenShare) return;
            const myId = UserStore.getCurrentUser().id;
            for (const state of voiceStates) {
                const { userId, channelId } = state;
                if (userId !== myId) continue;

                if (channelId && !hasStreamed) {
                    hasStreamed = true;
                    await startStream();
                }

                if (!channelId) {
                    hasStreamed = false;
                }

                break;
            }
        }
    },
    async trigger() {
        await startStream();
    }
});

