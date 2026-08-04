/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import type { Message, OnlineStatus, User } from "@vencord/discord-types";
import {
    ChannelStore,
    ConfirmModal,
    Menu,
    openModal,
    PermissionsBits,
    PermissionStore,
    PresenceStore,
    showToast,
    Toasts,
    UserStore,
    VoiceStateStore
} from "@webpack/common";

import { flushHistoryWrite, loadHistory, queueHistoryWrite, writeHistoryNow } from "./persistence";
import {
    type PresenceStatus,
    type TimelineMode,
    timelineStore } from "./store";
import { cancelPendingTimelineMessageNavigation, WrappedActivityTimelineModal } from "./TimelineModal";

const logger = new Logger("ActivityTimeline");

interface VoiceStateUpdate {
    userId?: string;
    guildId?: string;
    channelId?: string | null;
    oldChannelId?: string | null;
}

let presenceListener: (() => void) | undefined;
let lastPresence: PresenceStatus | null = null;
let voiceBaselines = new Map<string, string | undefined>();
let connectionReady = true;
let hydratedAccountId: string | undefined;
let hydrationPromise: Promise<void> | undefined;

function currentUserId() {
    return UserStore.getCurrentUser()?.id;
}

function normalizePresenceStatus(status: OnlineStatus | undefined): PresenceStatus | null {
    if (!status) return null;
    if (status === "online" || status === "idle" || status === "dnd" || status === "invisible" || status === "offline") return status;
    if (status === "streaming") return "online";
    return "offline";
}

function readPresence(userId: string) {
    try {
        return normalizePresenceStatus(PresenceStore.getStatus(userId));
    } catch (error) {
        logger.error("Could not read presence", error);
        return null;
    }
}

function canViewGuildChannel(channelId: string | undefined) {
    if (!channelId) return false;

    const channel = ChannelStore.getChannel(channelId);
    return Boolean(channel?.guild_id && PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel));
}

function readVoiceBaselines(userId: string) {
    const baselines = new Map<string, string | undefined>();

    try {
        const allStates = VoiceStateStore.getAllVoiceStates();
        for (const [guildId, states] of Object.entries(allStates)) {
            const state = states[userId];
            baselines.set(guildId, state?.channelId || undefined);
        }
    } catch (error) {
        logger.error("Could not read voice baselines", error);
    }

    return baselines;
}

function rebaseline() {
    const { target } = timelineStore.getSnapshot();
    if (!target) return;

    lastPresence = readPresence(target.userId);
    voiceBaselines = readVoiceBaselines(target.userId);
    connectionReady = true;
}

function persistHistory(force = false) {
    if (!hydratedAccountId || timelineStore.getSnapshot().hydrationState !== "ready") return Promise.resolve();
    const state = timelineStore.getPersistedState();
    const handleSaveError = (error: unknown) => {
        logger.error("Could not save Activity Timeline history", error);
        timelineStore.setStorageError("Activity Timeline history could not be saved.");
    };
    return (force ? writeHistoryNow(hydratedAccountId, state) : queueHistoryWrite(hydratedAccountId, state, handleSaveError)).catch(handleSaveError);
}

async function hydrateForCurrentAccount() {
    const accountId = currentUserId();
    if (!accountId) return;
    if (hydratedAccountId === accountId && timelineStore.getSnapshot().hydrationState === "ready") return;

    if (hydratedAccountId && timelineStore.getSnapshot().hydrationState === "ready") {
        timelineStore.stop();
        await writeHistoryNow(hydratedAccountId, timelineStore.getPersistedState());
    } else if (hydratedAccountId) {
        timelineStore.stop();
    }

    hydratedAccountId = accountId;
    try {
        const loaded = await loadHistory(accountId);
        timelineStore.hydrate(loaded.state);
        if (loaded.unsupported) {
            timelineStore.setStorageError("This Activity Timeline history was created by a newer version and was not changed.");
        } else if (loaded.recovered) {
            showToast("Some Activity Timeline history was discarded because it was invalid.", Toasts.Type.FAILURE);
            await writeHistoryNow(accountId, timelineStore.getPersistedState());
        } else {
            await writeHistoryNow(accountId, timelineStore.getPersistedState());
        }
    } catch (error) {
        logger.error("Could not load Activity Timeline history", error);
        timelineStore.setStorageError("Activity Timeline history could not be loaded. Try again later.");
    }
}

function ensureHydrated() {
    if (!hydrationPromise) hydrationPromise = hydrateForCurrentAccount().finally(() => hydrationPromise = undefined);
    return hydrationPromise;
}

function openActivityTimelineModal(initialTargetUserId?: string) {
    void ensureHydrated();
    openModal(props => (
        <WrappedActivityTimelineModal
            modalProps={props}
            initialTargetUserId={initialTargetUserId}
            onStart={startTrackingFromModal}
            onClear={clearTrackingHistory}
            onStop={stopTracking}
            onRetry={retryHydration}
        />
    ));
}

function startTracking(userId: string, mode: TimelineMode) {
    const sessionId = timelineStore.start({
        userId,
        mode,
        startedAt: Date.now()
    });
    if (sessionId === null) {
        showToast("Activity Timeline is still loading or its history is unavailable.", Toasts.Type.FAILURE);
        return false;
    }

    lastPresence = readPresence(userId);
    voiceBaselines = readVoiceBaselines(userId);
    connectionReady = true;

    const user = UserStore.getUser(userId);
    const name = user?.globalName || user?.username || userId;
    showToast(`Activity Timeline started for ${name}`, Toasts.Type.SUCCESS);
    void persistHistory(true);
    return true;
}

function stopTracking() {
    cancelPendingTimelineMessageNavigation();
    const wasActive = Boolean(timelineStore.getSnapshot().target);
    timelineStore.stop();
    lastPresence = null;
    voiceBaselines = new Map();
    if (wasActive) {
        showToast("Activity Timeline stopped", Toasts.Type.SUCCESS);
        void persistHistory(true);
    }
}

function startTrackingFromModal(userId: string) {
    const mode: TimelineMode = userId === currentUserId() ? "self" : "selected";
    const snapshot = timelineStore.getSnapshot();
    if (snapshot.target?.userId === userId) return;
    if (snapshot.target) {
        const user = UserStore.getUser(userId);
        const name = user?.globalName || user?.username || userId;
        openModal(props => (
            <ConfirmModal
                {...props}
                title="Switch Activity Timeline target?"
                subtitle={`Stop tracking the current target and start collecting new events for ${name}? Existing history will be kept.`}
                confirmText="Switch target"
                cancelText="Keep current target"
                onConfirm={() => startTracking(userId, mode)}
            />
        ));
        return;
    }
    startTracking(userId, mode);
}

function clearTrackingHistory(userId: string) {
    timelineStore.clearForUser(userId);
    void persistHistory(true);
    showToast("Activity Timeline history cleared", Toasts.Type.SUCCESS);
}

function retryHydration() {
    hydrationPromise = undefined;
    void ensureHydrated();
}

function addTimelineEvent(event: Parameters<typeof timelineStore.addEvent>[0]) {
    const added = timelineStore.addEvent(event);
    if (added) {
        void persistHistory();
    } else if (timelineStore.getSnapshot().capacityReached) {
        showToast("Activity Timeline stopped after reaching 20,000 events", Toasts.Type.FAILURE);
        void persistHistory(true);
    }
}

function handlePresenceChange() {
    const { target } = timelineStore.getSnapshot();
    if (!target || !connectionReady) return;

    const current = readPresence(target.userId);
    if (!current || !lastPresence || current === lastPresence) {
        lastPresence = current;
        return;
    }

    const previous = lastPresence;
    lastPresence = current;
    addTimelineEvent({
        type: "presence",
        timestamp: Date.now(),
        previousStatus: previous,
        currentStatus: current
    });
}

function handleMessageCreate(event: { message?: Message; optimistic?: boolean; }) {
    if (event.optimistic) return;

    const { target } = timelineStore.getSnapshot();
    const { message } = event;
    if (!target || !message || message.author?.id !== target.userId) return;

    const channel = ChannelStore.getChannel(message.channel_id);
    if (!channel?.guild_id || !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)) return;

    addTimelineEvent({
        type: "message",
        timestamp: Date.now(),
        guildId: channel.guild_id,
        channelId: message.channel_id,
        messageId: message.id
    });
}

function getVoiceGuildId(state: VoiceStateUpdate, event: { guildId?: string; }) {
    if (state.guildId || event.guildId) return state.guildId || event.guildId;

    const channelId = state.channelId || state.oldChannelId;
    return channelId ? ChannelStore.getChannel(channelId)?.guild_id : undefined;
}

function handleVoiceStateUpdates(event: { guildId?: string; voiceStates?: VoiceStateUpdate[]; }) {
    const { target } = timelineStore.getSnapshot();
    if (!target || !connectionReady) return;

    for (const state of event.voiceStates ?? []) {
        if (state.userId !== target.userId) continue;

        const guildId = getVoiceGuildId(state, event);
        if (!guildId) continue;

        const previousBaseline = voiceBaselines.get(guildId);
        const reportedOld = state.oldChannelId || undefined;
        const nextChannel = state.channelId || undefined;

        // Discord can replay a VOICE_STATE_UPDATES entry while resuming. The
        // baseline is the last state we accepted, so an unchanged destination
        // is a duplicate rather than a new movement.
        if (nextChannel === previousBaseline) continue;

        const fromChannel = target.mode === "self" && reportedOld === nextChannel
            ? previousBaseline
            : reportedOld ?? previousBaseline;

        voiceBaselines.set(guildId, nextChannel);
        if (fromChannel === nextChannel) continue;

        const fromVisible = canViewGuildChannel(fromChannel);
        const toVisible = canViewGuildChannel(nextChannel);
        if (!fromVisible && !toVisible) continue;

        const action = !fromVisible && toVisible
            ? "join"
            : fromVisible && !toVisible
                ? "leave"
                : "move";

        addTimelineEvent({
            type: "voice",
            timestamp: Date.now(),
            guildId,
            action,
            fromChannelId: fromVisible ? fromChannel : undefined,
            toChannelId: toVisible ? nextChannel : undefined
        });
    }
}

function handleMessageDelete(event: { channelId?: string; id?: string; }) {
    if (event.channelId && event.id)
        timelineStore.markMessageDeleted(event.channelId, event.id);
    void persistHistory();
}

function handleMessageDeleteBulk(event: { channelId?: string; ids?: string[]; }) {
    if (!event.channelId) return;
    for (const id of event.ids ?? []) timelineStore.markMessageDeleted(event.channelId, id);
    void persistHistory();
}

const patchUserContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const { user } = props as { user?: User; };
    if (!user) return;

    const snapshot = timelineStore.getSnapshot();
    const isCurrentTarget = snapshot.target?.userId === user.id;

    children.push(
        <Menu.MenuItem
            id="vc-activity-timeline-user"
            label="Open Activity Timeline"
            action={() => openActivityTimelineModal(user.id)}
        />
    );

    if (isCurrentTarget) {
        children.push(
            <Menu.MenuItem
                id="vc-activity-timeline-stop-user"
                label="Stop Activity Timeline"
                color="danger"
                action={stopTracking}
            />
        );
    }
};

export default definePlugin({
    name: "ActivityTimeline",
    authors: [Devs.reticla, Devs.rexy0345],
    description: "Keeps a local 72-hour timeline of messages, presence changes, and voice activity for one selected user or yourself",
    tags: ["Utility", "Privacy"],
    contextMenus: {
        "user-context": patchUserContextMenu
    },

    toolboxActions() {
        const snapshot = timelineStore.getSnapshot();
        if (!snapshot.target) {
            return [
                <Menu.MenuItem
                    id="vc-activity-timeline-open"
                    key="vc-activity-timeline-open"
                    label="Open Activity Timeline"
                    action={() => openActivityTimelineModal()}
                />
            ];
        }

        const user = UserStore.getUser(snapshot.target.userId);
        const name = user?.globalName || user?.username || snapshot.target.userId;

        return [
            <Menu.MenuItem
                id="vc-activity-timeline-open-active"
                key="vc-activity-timeline-open-active"
                label={`Open Activity Timeline (${name})`}
                action={() => openActivityTimelineModal()}
            />,
            <Menu.MenuItem
                id="vc-activity-timeline-stop"
                key="vc-activity-timeline-stop"
                label="Stop Activity Timeline"
                color="danger"
                action={stopTracking}
            />
        ];
    },

    start() {
        void ensureHydrated();
        presenceListener = () => {
            try {
                handlePresenceChange();
            } catch (error) {
                logger.error("Could not record presence activity", error);
            }
        };
        PresenceStore.addChangeListener(presenceListener);
    },

    stop() {
        if (presenceListener) PresenceStore.removeChangeListener(presenceListener);
        presenceListener = undefined;
        stopTracking();
        void flushHistoryWrite().catch(error => logger.error("Could not flush Activity Timeline history", error));
        connectionReady = false;
    },

    flux: {
        MESSAGE_CREATE(event: { message?: Message; optimistic?: boolean; }) {
            try {
                handleMessageCreate(event);
            } catch (error) {
                logger.error("Could not record message activity", error);
            }
        },

        MESSAGE_DELETE(event: { channelId?: string; id?: string; }) {
            handleMessageDelete(event);
        },

        MESSAGE_DELETE_BULK(event: { channelId?: string; ids?: string[]; }) {
            handleMessageDeleteBulk(event);
        },

        VOICE_STATE_UPDATES(event: { guildId?: string; voiceStates?: VoiceStateUpdate[]; }) {
            try {
                handleVoiceStateUpdates(event);
            } catch (error) {
                logger.error("Could not record voice activity", error);
            }
        },

        CHANNEL_DELETE(event: { channel?: { id?: string; }; id?: string; }) {
            const channelId = event.channel?.id || event.id;
            if (channelId) timelineStore.removeChannel(channelId);
        },

        GUILD_DELETE(event: { guild?: { id?: string; }; guildId?: string; }) {
            const guildId = event.guild?.id || event.guildId;
            if (guildId) timelineStore.removeGuild(guildId);
        },

        CONNECTION_CLOSED() {
            connectionReady = false;
        },

        CONNECTION_OPEN() {
            rebaseline();
        },

        CONNECTION_RESUMED() {
            rebaseline();
        }
    }
});
