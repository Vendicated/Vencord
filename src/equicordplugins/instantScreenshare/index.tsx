/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCode, findByProps } from "@webpack";
import { ChannelStore, SelectedChannelStore, UserStore } from "@webpack/common";
import { VoiceState } from "@webpack/types";

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
    name: "InstantScreenshare",
    description: "Instantly screenshare your first screen when joining a voice channel",
    authors: [Devs.HAHALOSAH, EquicordDevs.thororen],
    flux: {
        async VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
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
});

