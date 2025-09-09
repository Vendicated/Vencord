/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { VoiceState } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, PermissionsBits, PermissionStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { getCurrentMedia, settings } from "./utils";

const startStream = findByCodeLazy('type:"STREAM_START"');

let hasStreamed;

async function autoStartStream() {
    const selected = SelectedChannelStore.getVoiceChannelId();
    if (!selected) return;
    const channel = ChannelStore.getChannel(selected);

    if (channel.type === 13 || !PermissionStore.can(PermissionsBits.STREAM, channel)) return;

    const streamMedia = await getCurrentMedia();

    startStream(channel.guild_id, selected, {
        "pid": null,
        "sourceId": streamMedia.id,
        "sourceName": streamMedia.name,
        "audioSourceId": null,
        "sound": true,
        "previewDisabled": false
    });
}

export default definePlugin({
    name: "InstantScreenshare",
    description: "Instantly screenshare when joining a voice channel",
    authors: [Devs.HAHALOSAH, Devs.thororen],
    settings,
    flux: {
        async VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myId = UserStore.getCurrentUser().id;
            for (const state of voiceStates) {
                const { userId, channelId } = state;
                if (userId !== myId) continue;

                if (channelId && !hasStreamed) {
                    hasStreamed = true;
                    await autoStartStream();
                }

                if (!channelId) {
                    hasStreamed = false;
                }

                break;
            }
        }
    },
});

