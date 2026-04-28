/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GenericStore, GuildStore, UserStore } from "@webpack/common";

import { logStalkerEvent } from ".";
import { getTargets } from "./shared";

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");

let lastVoiceState: { [userid: string]: MainVoiceStateData; } = {};

type MainVoiceStateData = {
    channelId: string;
    userId: string;
};

const VoiceStateStore: GenericStore = findStoreLazy("VoiceStateStore");

export const init = () => {
    voiceStateChange(); // init it cause you might wanna join asap
    VoiceStateStore.addChangeListener(voiceStateChange);
};

export const deinit = () => {
    VoiceStateStore.removeChangeListener(voiceStateChange);
};

const getChannelName = (channelId: string): string => {
    const channelData = ChannelStore.getChannel(channelId);

    if (channelData.isGuildVoice() || channelData.isGuildStageVoice()) {
        const guildData = GuildStore.getGuild(channelData.guild_id);
        return `${channelData.name} from ${guildData.name}`;
    } else {
        return channelData.name;
    }

    return "";
};

export const voiceStateChange = () => {
    const newVoiceState = {};
    for (const id of getTargets()) {
        newVoiceState[id] = VoiceStateStore.getVoiceStateForUser(id);
        const voiceState: MainVoiceStateData = newVoiceState[id];
        const lastVoiceStateForUser = lastVoiceState[id];

        if (voiceState && !lastVoiceStateForUser) {
            const user = UserStore.getUser(id);
            const color = `#${user.accentColor?.toString(16)}`;

            showNotification({
                body: `${user.username} is in VC: ${getChannelName(voiceState.channelId)}\nClick to join them.`,
                title: "Stalker",
                icon: user.getAvatarURL(),
                color,
                onClick: () => {
                    selectVoiceChannel(voiceState.channelId);
                },
            });

            // Registra l'evento di stalking
            logStalkerEvent({
                timestamp: new Date().toISOString(),
                userId: user.id,
                username: user.username,
                action: "voice_join",
                details: `Joined voice channel: ${getChannelName(voiceState.channelId)}`
            });
        }

        // Controlla se l'utente è uscito da un canale vocale
        if (!voiceState && lastVoiceStateForUser) {
            const user = UserStore.getUser(id);

            logStalkerEvent({
                timestamp: new Date().toISOString(),
                userId: user.id,
                username: user.username,
                action: "voice_leave",
                details: `Left voice channel: ${getChannelName(lastVoiceStateForUser.channelId)}`
            });
        }
    }

    lastVoiceState = newVoiceState;
};
