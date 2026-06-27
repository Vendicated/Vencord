/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";
import {
    ChannelStore,
    FluxDispatcher,
    UserStore,
    VoiceStateStore
} from "@webpack/common";
import {
    currentVoiceChannelId,
    frequencyCache,
    lastBackup,
    loadData,
    recordInteraction,
    setCurrentVoiceChannelId,
    setFrequencyCache,
    setLastBackup,
    startVoiceScoring,
    stopVoiceScoring,
    subscribeToBackupChanges,
    subscribeToScoreChanges,
    syncWithAffinities
} from "./scoring";
import settings, { pluginCallbacks } from "./settings";
import { getForceUpdateWidget, isPluginEnabled, setIsEnabled } from "./state";
import { FrequentFriendsWidget } from "./ui";
import "./style.css";

// Wire up settings callbacks to scoring module (avoids circular dependency)
pluginCallbacks.getFrequencyCache = () => frequencyCache;
pluginCallbacks.setFrequencyCache = cache => setFrequencyCache(cache);
pluginCallbacks.getLastBackup = () => lastBackup;
pluginCallbacks.setLastBackup = backup => setLastBackup(backup);
pluginCallbacks.syncWithAffinities = () => syncWithAffinities();
pluginCallbacks.subscribeToBackupChanges = fn => subscribeToBackupChanges(fn);
pluginCallbacks.subscribeToScoreChanges = fn => subscribeToScoreChanges(fn);

interface FluxMessageEvent {
    message?: {
        author?: { id?: string; };
        channel_id?: string;
    };
}

interface FluxVoiceStateEvent {
    voiceStates?: Array<{
        userId: string;
        channelId?: string | null;
    }>;
}

function onMessage(e: FluxMessageEvent) {
    const msg = e?.message;
    const currentUser = UserStore.getCurrentUser();
    if (!msg?.author?.id || !currentUser) return;
    const channel = ChannelStore.getChannel(msg.channel_id!);
    if (!channel || channel.type !== 1) return;
    const targetId = msg.author.id === currentUser.id ? channel.recipients?.[0] : msg.author.id;
    if (targetId) recordInteraction(targetId, "dm");
}

function onVoiceStateUpdate(e: FluxVoiceStateEvent) {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return;
    if (!Array.isArray(e?.voiceStates)) return;
    for (const vs of e.voiceStates) {
        if (vs.userId !== currentUser.id) continue;
        const newChannelId = vs.channelId ?? null;
        if (newChannelId === currentVoiceChannelId) return;
        setCurrentVoiceChannelId(newChannelId);
        newChannelId ? startVoiceScoring() : stopVoiceScoring();
        return;
    }
}

// syncTimeout is kept at module scope so stop() can cancel it and prevent
// a stale account's affinity data from being written into the new account's store.
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

async function onCurrentUserUpdate() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
    }
    if (!isPluginEnabled()) return;
    stopVoiceScoring();
    setCurrentVoiceChannelId(null);
    await loadData();
    // Discord stores take some time to flush old data and load new data on account switch.
    // Delaying the affinity sync prevents cross-account data pollution.
    syncTimeout = setTimeout(() => {
        syncTimeout = null;
        if (isPluginEnabled()) syncWithAffinities();
    }, 5000);
}

export default definePlugin({
    name: "FrequentFriends",
    description: "Shows friends you interact with most frequently in your DM sidebar.",
    authors: [{ name: "0nerf", id: 515200391395409920n }],
    settings,

    patches: [
        {
            find: '"dm-quick-launcher"===',
            replacement: [
                {
                    // Guard against double-wrapping on plugin restart:
                    // if the function is already our wrapper (_ffWrapped flag),
                    // return it as-is instead of wrapping again.
                    match: /(renderSection:)([^,}]+)/,
                    replace: "$1 (this._ffRenderSection ??= $self.hookRenderSection(this, $2))"
                }
            ]
        }
    ],

    hookRenderSection(instance: any, originalRenderSection: Function) {
        // Bail out early if this instance was already patched — prevents double-wrap
        // when the plugin is stopped and restarted without a full client reload.
        if (typeof originalRenderSection === "function" && (originalRenderSection as any)._ffWrapped) {
            return originalRenderSection;
        }

        const wrapped = function (this: any, e: any) {
            const originalResult = originalRenderSection.call(instance, e);
            if (e.section === 1 && isPluginEnabled()) {
                return (
                    <React.Fragment key="ff-section-1">
                        <ErrorBoundary noop>
                            <FrequentFriendsWidget />
                        </ErrorBoundary>
                        {originalResult}
                    </React.Fragment>
                );
            }
            return originalResult;
        };

        // Mark so we can detect re-wrapping on restart
        Object.defineProperty(wrapped, "_ffWrapped", { value: true, writable: false });
        return wrapped;
    },

    async start() {
        setIsEnabled(true);
        getForceUpdateWidget()?.();
        await loadData();
        await syncWithAffinities();
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", onVoiceStateUpdate);
        FluxDispatcher.subscribe("CURRENT_USER_UPDATE", onCurrentUserUpdate);
        this._initVoiceState();
    },

    _initVoiceState() {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser) return;
        const myState = (VoiceStateStore as any).getVoiceStateForUser?.(currentUser.id);
        if (myState?.channelId) {
            setCurrentVoiceChannelId(myState.channelId);
            startVoiceScoring();
        }
    },

    stop() {
        setIsEnabled(false);
        getForceUpdateWidget()?.();
        stopVoiceScoring();
        setCurrentVoiceChannelId(null);
        // Cancel any pending affinity sync to prevent writing stale account data
        if (syncTimeout) {
            clearTimeout(syncTimeout);
            syncTimeout = null;
        }
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", onVoiceStateUpdate);
        FluxDispatcher.unsubscribe("CURRENT_USER_UPDATE", onCurrentUserUpdate);
    }
});
