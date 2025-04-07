/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode, findByProps } from "@webpack";
import { ChannelStore, PermissionsBits, PermissionStore, SelectedChannelStore, UserStore } from "@webpack/common";
import { VoiceState } from "@webpack/types";

const settings = definePluginSettings({
    streamType: {
        description: "Stream screen or window",
        type: OptionType.SELECT,
        options: [
            { label: "Screen", value: "screen" },
            { label: "Window", value: "window" }
        ],
        default: "screen"
    },
    streamWindowKeyword: {
        description: "Keyword to search for in window title",
        type: OptionType.STRING,
        default: "",
        placeholder: "Enter keyword"
    }
});

let hasStreamed;
let sources;
let source;

async function startStream() {
    const startStream = findByCode('type:"STREAM_START"');
    const mediaEngine = findByProps("getMediaEngine").getMediaEngine();
    const getDesktopSources = findByCode("desktop sources");
    const selected = SelectedChannelStore.getVoiceChannelId();
    if (!selected) return;
    const channel = ChannelStore.getChannel(selected);

    if (channel.type === 13 || !PermissionStore.can(PermissionsBits.STREAM, channel)) return;

    if (settings.store.streamType === "screen") {
        sources = await getDesktopSources(mediaEngine, ["screen"], null);
        source = sources[0];
    } else if (settings.store.streamType === "window") {
        const keyword = settings.store.streamWindowKeyword?.toLowerCase();
        sources = await getDesktopSources(mediaEngine, ["window", "application"], null);
        source = sources.find(s => s.name?.toLowerCase().includes(keyword));
    }

    if (!source) return;

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
    description: "Instantly screenshare when joining a voice channel",
    authors: [Devs.HAHALOSAH, EquicordDevs.thororen],
    settings,
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

