/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxEvent, MessageJSON } from "@vencord/discord-types";

import settings from "../settings";
import { MediaEngineStore, RTCConnectionStore, UserStore } from "../stores";
import AudioPlayer from "./AudioPlayer";
import { getPatchedAnnouncement, getPatchedContent, getUserName, shouldPlayMessage } from "./utils";

export function messageRecieved(event: FluxEvent) {
    if (!settings.store.enableTts) return;
    const message = event.message as MessageJSON;
    if ((event.guildId || !message.member) && shouldPlayMessage(event.message)) {
        const text = getPatchedContent(message, message.guild_id);
        AudioPlayer.enqueueTTSMessage(text, "message");
    }
}

export function annouceUser(event: FluxEvent) {
    if (!settings.store.enableTts) return;
    const connectedChannelId = RTCConnectionStore.getChannelId();
    const userId = UserStore.getCurrentUser().id;
    for (const userStatus of event.voiceStates) {
        if (connectedChannelId && userStatus.userId !== userId) {
            if (userStatus.channelId !== userStatus.oldChannelId) {
                const username = getUserName(userStatus.userId, userStatus.guildId);
                if (userStatus.channelId === connectedChannelId) {
                    AudioPlayer.enqueueTTSMessage(getPatchedAnnouncement(true, userStatus.userId, userStatus.guildId), "user");
                } else if (userStatus.oldChannelId === connectedChannelId) {
                    AudioPlayer.enqueueTTSMessage(getPatchedAnnouncement(false, userStatus.userId, userStatus.guildId), "user");
                }
            }
        }
    }
}

export function speakMessage(event: FluxEvent) {
    if (!settings.store.enableTts) return;
    const text = getPatchedContent(event.message, event.channel.guild_id);
    AudioPlayer.enqueueTTSMessage(text, "preview");
}

export function stopTTS() {
    if (MediaEngineStore.isSelfDeaf())
        AudioPlayer.stopTTS();
}
