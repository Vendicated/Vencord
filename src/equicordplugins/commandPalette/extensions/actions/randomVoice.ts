/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { openPluginModal } from "@components/settings/tabs";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { ChannelActions, ChannelRouter, ChannelStore, MediaEngineStore, PermissionsBits, PermissionStore, SelectedChannelStore, Toasts, UserStore, VoiceActions, VoiceStateStore } from "@webpack/common";

import { DEFAULT_CATEGORY_ID } from "../../metadata/categories";
import { TAG_PLUGINS, TAG_UTILITY } from "../../metadata/tags";
import type { CommandEntry } from "../../registry";
import { DEFAULT_EXTENSION_KEYBINDS, RANDOM_VOICE_EXTENSION_ID } from "../catalog";
import type { ExtensionKeybindMap, RandomVoiceOperation, RandomVoicePluginWithSettings, RandomVoiceSettingsStore, RandomVoiceStateLike } from "../types";
import { createExecuteSecondaryAction } from "./actionHelpers";

function showToast(message: string, type: (typeof Toasts.Type)[keyof typeof Toasts.Type]) {
    Toasts.show({ message, type, id: Toasts.genId(), options: { position: Toasts.Position.BOTTOM } });
}

function getRandomVoicePlugin(): RandomVoicePluginWithSettings | null {
    const plugin = plugins.RandomVoice as RandomVoicePluginWithSettings | undefined;
    return plugin ?? null;
}

function getRandomVoiceSettingsStore(): RandomVoiceSettingsStore | null {
    const plugin = getRandomVoicePlugin();
    if (!plugin) return null;
    return plugin.settings?.store ?? null;
}

async function ensureRandomVoicePluginEnabled() {
    const plugin = getRandomVoicePlugin();
    if (!plugin) {
        showToast("RandomVoice plugin is unavailable.", Toasts.Type.FAILURE);
        return false;
    }

    if (isPluginEnabled(plugin.name)) return true;

    const success = await toggleEnabled(plugin.name);
    if (!success || !isPluginEnabled(plugin.name)) {
        showToast("Failed to enable RandomVoice.", Toasts.Type.FAILURE);
        return false;
    }

    showToast("Enabled RandomVoice.", Toasts.Type.SUCCESS);
    return true;
}

function hasActiveRandomVoiceStateFilters(store: RandomVoiceSettingsStore): boolean {
    return Boolean(store.mute || store.deafen || store.video || store.stream);
}

function randomVoiceStateMatchesFilters(state: RandomVoiceStateLike, store: RandomVoiceSettingsStore): boolean {
    if (store.mute && !state.selfMute) return false;
    if (store.deafen && !state.selfDeaf) return false;
    if (store.video && !state.selfVideo) return false;
    if (store.stream && !state.selfStream) return false;
    return true;
}

function randomVoiceOperationMatches(operation: RandomVoiceOperation, left: number, right: number): boolean {
    if (operation === "==") return left === right;
    if (operation === ">") return left > right;
    return left < right;
}

function pickRandomVoiceChannelId(store: RandomVoiceSettingsStore): string | null {
    const candidates = new Set<string>();
    const currentUserId = UserStore.getCurrentUser()?.id;
    const serverFilters = store.Servers.split("/").map(value => value.trim()).filter(Boolean);
    const hasStateFilters = hasActiveRandomVoiceStateFilters(store);
    const users = Object.values(UserStore.getUsers() ?? {}) as Array<{ id?: string; }>;

    for (const user of users) {
        const userId = user.id;
        if (!userId) continue;

        const state = VoiceStateStore.getVoiceStateForUser(userId) as RandomVoiceStateLike | undefined;
        const channelId = state?.channelId;
        if (!channelId || candidates.has(channelId)) continue;

        const channel = ChannelStore.getChannel(channelId);
        if (!channel) continue;

        const guildId = typeof channel.getGuildId === "function"
            ? channel.getGuildId()
            : channel.guild_id;
        if (!guildId) continue;
        if (serverFilters.length > 0 && !serverFilters.includes(guildId)) continue;
        if (store.avoidStages && typeof channel.isGuildStageVoice === "function" && channel.isGuildStageVoice()) continue;

        const voiceStates = VoiceStateStore.getVoiceStatesForChannel(channelId) as Record<string, RandomVoiceStateLike> | undefined;
        const usersInChannel = voiceStates ? Object.keys(voiceStates).length : 0;
        const channelLimit = channel.userLimit === 0 ? 99 : channel.userLimit;
        const spacesLeft = channelLimit - usersInChannel;

        if (!randomVoiceOperationMatches(store.spacesLeftOperation, spacesLeft, store.spacesLeft)) continue;
        if (!randomVoiceOperationMatches(store.UserAmountOperation, usersInChannel, store.UserAmount)) continue;
        if (!randomVoiceOperationMatches(store.vcLimitOperation, channelLimit, store.vcLimit)) continue;
        if (channel.userLimit > 0 && usersInChannel >= channel.userLimit) continue;
        if (currentUserId && voiceStates && Object.prototype.hasOwnProperty.call(voiceStates, currentUserId)) continue;
        if (!PermissionStore.can(PermissionsBits.CONNECT, channel)) continue;
        if (store.avoidAfk && !PermissionStore.can(PermissionsBits.SPEAK, channel)) continue;

        if (hasStateFilters && voiceStates) {
            const states = Object.values(voiceStates);
            const hasMatches = states.some(voiceState => randomVoiceStateMatchesFilters(voiceState, store));
            if (store.includeStates && !hasMatches) continue;
            if (store.avoidStates && hasMatches) continue;
        }

        candidates.add(channelId);
    }

    if (candidates.size === 0) return null;

    const available = Array.from(candidates);
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex] ?? null;
}

async function runRandomVoiceJoin() {
    if (!await ensureRandomVoicePluginEnabled()) return;

    const store = getRandomVoiceSettingsStore();
    if (!store) {
        showToast("RandomVoice settings are unavailable.", Toasts.Type.FAILURE);
        return;
    }

    const channelId = pickRandomVoiceChannelId(store);
    if (!channelId) {
        showToast("Failed to find a voice channel.", Toasts.Type.MESSAGE);
        return;
    }

    const channel = ChannelStore.getChannel(channelId);
    if (!channel) {
        showToast("Voice channel is unavailable.", Toasts.Type.FAILURE);
        return;
    }

    ChannelActions.selectVoiceChannel(channelId);
    if (store.autoNavigate) {
        ChannelRouter.transitionToChannel(channelId);
    }
    if (store.selfMute && !MediaEngineStore.isSelfMute() && SelectedChannelStore.getVoiceChannelId()) {
        VoiceActions.toggleSelfMute();
    }
    if (store.selfDeafen && !MediaEngineStore.isSelfDeaf() && SelectedChannelStore.getVoiceChannelId()) {
        VoiceActions.toggleSelfDeaf();
    }
}

async function runRandomVoiceToggleAutoNavigate() {
    if (!await ensureRandomVoicePluginEnabled()) return;

    const store = getRandomVoiceSettingsStore();
    if (!store) {
        showToast("RandomVoice settings are unavailable.", Toasts.Type.FAILURE);
        return;
    }

    store.autoNavigate = !store.autoNavigate;
    showToast(`RandomVoice auto navigate ${store.autoNavigate ? "enabled" : "disabled"}.`, Toasts.Type.SUCCESS);
}

async function runRandomVoiceOpenSettings() {
    if (!await ensureRandomVoicePluginEnabled()) return;

    const plugin = getRandomVoicePlugin();
    if (!plugin) {
        showToast("RandomVoice plugin is unavailable.", Toasts.Type.FAILURE);
        return;
    }

    openPluginModal(plugin);
}

export function createRandomVoiceExtensionCommand(extensionKeybinds: Map<string, ExtensionKeybindMap>): CommandEntry {
    const keybinds = extensionKeybinds.get(RANDOM_VOICE_EXTENSION_ID) ?? DEFAULT_EXTENSION_KEYBINDS[RANDOM_VOICE_EXTENSION_ID];

    return {
        id: "extension-random-voice-join",
        label: "Join Random Voice",
        description: "Joins a random voice channel using RandomVoice filters.",
        keywords: ["randomvoice", "random voice", "join", "voice", "channel", "plugin", "extension", "auto navigate", "settings"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: runRandomVoiceJoin,
        actions: () => [
            createExecuteSecondaryAction({
                id: "toggle-auto-navigate",
                label: "Toggle auto navigate",
                chord: keybinds.secondaryActionChord,
                handler: runRandomVoiceToggleAutoNavigate
            }),
            createExecuteSecondaryAction({
                id: "open-settings",
                label: "Open settings",
                chord: keybinds.tertiaryActionChord,
                handler: runRandomVoiceOpenSettings
            })
        ]
    };
}
