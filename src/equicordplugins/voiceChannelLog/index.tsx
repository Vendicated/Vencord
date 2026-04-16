/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelType } from "@vencord/discord-types/enums";
import { findByPropsLazy } from "@webpack";
import { ApplicationStore, ChannelStore, Menu, RelationshipStore, SelectedChannelStore, UserStore, VoiceStateStore } from "@webpack/common";

import { LogIcon, OpenLogsButton } from "./components/LogsButton";
import { openVoiceChannelLog } from "./components/VoiceChannelLogModal";
import { addLogEntry, setCallStartTime } from "./logs";
import settings from "./settings";
import { EmbeddedActivityEvent, PreviousVoiceState, SoundEvent, VoiceChannelLogEntry, VoiceState } from "./types";

const { fetchApplication } = findByPropsLazy("fetchApplication");

const loggedActivities = new Set<string>();
const previousStates = new Map<string, PreviousVoiceState>();
const existingUsers = new Set<string>();

let clientOldChannelId: string | undefined;
let clientJoinedAt = 0;

function isMyChannel(channelId?: string): boolean {
    return !!channelId && SelectedChannelStore.getVoiceChannelId() === channelId;
}

function shouldLog(userId: string): boolean {
    return !(settings.store.ignoreBlockedUsers && RelationshipStore.isBlocked(userId));
}

function log(entry: Omit<VoiceChannelLogEntry, "timestamp">) {
    addLogEntry({ ...entry, timestamp: new Date() });
}

const VOICE_CHANNEL_TYPES = new Set([ChannelType.GUILD_VOICE, ChannelType.GUILD_STAGE_VOICE, ChannelType.DM, ChannelType.GROUP_DM]);

const patchChannelContextMenu: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!VOICE_CHANNEL_TYPES.has(channel.type)) return;
    children.push(
        <Menu.MenuItem
            id="vc-view-voice-channel-logs"
            label="View Voice Channel Logs"
            action={() => openVoiceChannelLog(channel)}
        />
    );
};

export default definePlugin({
    name: "VoiceChannelLog",
    description: "Logs voice channel activity including joins, leaves, soundboard, mute, camera, screenshare, and more.",
    tags: ["Servers", "Utility", "Voice"],
    authors: [Devs.Sqaaakoi, Devs.thororen, EquicordDevs.nyx, Devs.Moxxie, EquicordDevs.Fres, Devs.amy],
    dependencies: ["AudioPlayerAPI", "HeaderBarAPI"],
    settings,
    contextMenus: {
        "channel-context": patchChannelContextMenu
    },

    toolboxActions: {
        "Voice Channel Logs"() {
            const channelId = SelectedChannelStore.getVoiceChannelId();
            if (!channelId) return;
            const channel = ChannelStore.getChannel(channelId);
            if (channel) openVoiceChannelLog(channel);
        }
    },

    headerBarButton: {
        icon: LogIcon,
        render: OpenLogsButton
    },

    flux: {
        VOICE_CHANNEL_SELECT({ channelId, currentVoiceChannelId }: { channelId: string | null; currentVoiceChannelId: string | null; }) {
            const leaving = channelId == null && currentVoiceChannelId != null;
            const joining = channelId != null && currentVoiceChannelId == null;
            const oldChannel = currentVoiceChannelId ?? clientOldChannelId;

            clientOldChannelId = channelId ?? undefined;

            if (leaving && oldChannel) {
                const userId = UserStore.getCurrentUser().id;
                if (settings.store.logJoinLeave) {
                    log({ type: "leave", userId, channelId: oldChannel });
                }
                setCallStartTime(null);
                loggedActivities.clear();
            } else if (joining && channelId && channelId !== oldChannel) {
                clientJoinedAt = Date.now();
                setCallStartTime(new Date());
                if (settings.store.logJoinLeave) {
                    log({ type: "join", userId: UserStore.getCurrentUser().id, channelId });
                }
            }
        },

        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const clientUserId = UserStore.getCurrentUser().id;
            const suppressJoins = Date.now() - clientJoinedAt < 5000;

            for (const state of voiceStates) {
                const { userId } = state;
                const { channelId, oldChannelId } = state;

                if (userId === clientUserId) continue;
                if (!shouldLog(userId)) continue;

                if (oldChannelId === channelId && !previousStates.has(userId)) {
                    previousStates.set(userId, {
                        mute: state.mute,
                        deaf: state.deaf,
                        selfVideo: state.selfVideo,
                        selfStream: state.selfStream ?? false,
                        channelId
                    });
                    continue;
                }

                const prev = previousStates.get(userId);
                const inMyChannel = isMyChannel(channelId) || isMyChannel(oldChannelId);

                if (oldChannelId !== channelId) {
                    if (!oldChannelId && channelId) {
                        const skipJoin = suppressJoins || existingUsers.delete(userId);
                        if (!skipJoin && settings.store.logJoinLeave && isMyChannel(channelId)) {
                            log({ type: "join", userId, channelId });
                        }
                    } else if (oldChannelId && !channelId) {
                        if (settings.store.logJoinLeave && isMyChannel(oldChannelId)) {
                            log({ type: "leave", userId, channelId: oldChannelId });
                        }
                    } else if (oldChannelId && channelId) {
                        if (settings.store.logJoinLeave) {
                            if (isMyChannel(oldChannelId)) {
                                log({ type: "move", userId, channelId: oldChannelId, oldChannelId, newChannelId: channelId });
                            }
                            if (isMyChannel(channelId)) {
                                log({ type: "move", userId, channelId, oldChannelId, newChannelId: channelId });
                            }
                        }
                    }
                }

                if (prev && channelId && inMyChannel) {
                    if (settings.store.logMuteDeafen) {
                        if (state.mute !== prev.mute) {
                            log({ type: "server_mute", userId, channelId, enabled: state.mute });
                        }
                        if (state.deaf !== prev.deaf) {
                            log({ type: "server_deafen", userId, channelId, enabled: state.deaf });
                        }
                    }

                    if (settings.store.logVideo && state.selfVideo !== prev.selfVideo) {
                        log({ type: "self_video", userId, channelId, enabled: state.selfVideo });
                    }

                    if (settings.store.logStream && (state.selfStream ?? false) !== prev.selfStream) {
                        log({ type: "self_stream", userId, channelId, enabled: state.selfStream ?? false });
                    }
                }

                previousStates.set(userId, {
                    mute: state.mute,
                    deaf: state.deaf,
                    selfVideo: state.selfVideo,
                    selfStream: state.selfStream ?? false,
                    channelId
                });

                if (!channelId) {
                    previousStates.delete(userId);
                }
            }
        },

        EMBEDDED_ACTIVITY_UPDATE_V2(event: EmbeddedActivityEvent) {
            if (!settings.store.logActivity) return;

            const channelId = event.location?.channel_id;
            if (!channelId || !isMyChannel(channelId)) return;

            const appId = event.applicationId;
            const currentUserIds = new Set((event.participants ?? []).map(p => p.user_id));

            const joined: string[] = [];
            for (const p of event.participants ?? []) {
                if (!shouldLog(p.user_id)) continue;
                const dedupKey = `${p.user_id}-${appId}`;
                if (loggedActivities.has(dedupKey)) continue;
                loggedActivities.add(dedupKey);
                joined.push(p.user_id);
            }

            const left: string[] = [];
            for (const key of loggedActivities) {
                if (!key.endsWith(`-${appId}`)) continue;
                const userId = key.slice(0, -(appId.length + 1));
                if (!currentUserIds.has(userId)) {
                    loggedActivities.delete(key);
                    left.push(userId);
                }
            }

            if (!joined.length && !left.length) return;

            const app = ApplicationStore.getApplication(appId);
            const logWithName = (activityName: string) => {
                for (const userId of joined)
                    log({ type: "activity", userId, channelId, activityName, applicationId: appId });
                for (const userId of left)
                    log({ type: "activity_stop", userId, channelId, activityName, applicationId: appId });
            };

            if (app) {
                logWithName(app.name);
            } else {
                fetchApplication(appId).then(fetched => logWithName(fetched?.name ?? "Unknown activity")).catch(() => logWithName("Unknown activity"));
            }
        },

        VOICE_CHANNEL_EFFECT_SEND(event: SoundEvent) {
            if (!settings.store.logSoundboard) return;
            if (!event.soundId) return;
            if (!isMyChannel(event.channelId)) return;
            if (!shouldLog(event.userId)) return;

            log({
                type: "soundboard",
                userId: event.userId,
                channelId: event.channelId,
                soundId: event.soundId,
                emoji: event.emoji
            });
        }
    },

    start() {
        clientOldChannelId = SelectedChannelStore.getVoiceChannelId() ?? undefined;
        if (clientOldChannelId) {
            clientJoinedAt = Date.now();
            setCallStartTime(new Date());
            if (settings.store.logJoinLeave) {
                log({ type: "join", userId: UserStore.getCurrentUser().id, channelId: clientOldChannelId });
            }
            const states = VoiceStateStore.getVoiceStatesForChannel(clientOldChannelId);
            for (const [userId, s] of Object.entries(states)) {
                existingUsers.add(userId);
                previousStates.set(userId, {
                    mute: s.mute,
                    deaf: s.deaf,
                    selfVideo: s.selfVideo,
                    selfStream: s.selfStream ?? false,
                    channelId: clientOldChannelId
                });
            }
        }
    },

    stop() {
        previousStates.clear();
        loggedActivities.clear();
        existingUsers.clear();
        setCallStartTime(null);
    }
});
