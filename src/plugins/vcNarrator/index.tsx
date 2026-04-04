/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Button, ChannelStore, Forms, GuildMemberStore, SelectedChannelStore, useMemo, UserStore } from "@webpack/common";
import { VoiceState } from "@webpack/types";

import { getCurrentVoice, settings } from "./settings";

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");

const messageTypes = [
    "join", "leave", "move",
    "mute", "unmute", "deafen", "undeafen",
    "screenShareStart", "screenShareStop",
    "screenShareViewerJoin", "screenShareViewerLeave"
] as const;

type MessageType = typeof messageTypes[number];

function toLabel(key: string) {
    return key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

function playSample(tempSettings: typeof settings.store | undefined, type: MessageType) {
    const s = tempSettings ?? settings.store;

    const myId = UserStore.getCurrentUser()?.id ?? "";
    const chanId = SelectedChannelStore.getVoiceChannelId();
    const channel = chanId ? ChannelStore.getChannel(chanId) : null;
    const user = UserStore.getUser(myId);
    if (!user) return;

    const member = channel?.guild_id ? GuildMemberStore.getMember(channel.guild_id, myId) : null;
    const strip = (str: string) => s.latinOnly ? str.replace(/[^\x00-\x7F]/g, "") : str;

    const username = strip(user.username);
    const displayName = strip(user.globalName || user.username);
    const nickname = strip(member?.nick || user.globalName || user.username);

    const key = `${type}Message` as keyof typeof settings.store;
    const template: string = (s as any)[key] ?? (settings.store as any)[key] ?? "";
    if (!template.trim()) return;

    const text = formatText(template, username, displayName, nickname, channel?.name ?? "general");
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = getCurrentVoice() ?? null;
    utterance.volume = s.volume ?? settings.store.volume;
    utterance.rate = s.rate ?? settings.store.rate;
    speechSynthesis.speak(utterance);
}

function speak(text: string) {
    if (!window.speechSynthesis || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = getCurrentVoice() ?? null;
    utterance.volume = settings.store.volume;
    utterance.rate = settings.store.rate;
    speechSynthesis.speak(utterance);
}

function formatText(template: string, user: string, displayName: string, nickname: string, channel: string) {
    return template
        .replaceAll("{{USER}}", user)
        .replaceAll("{{DISPLAY_NAME}}", displayName)
        .replaceAll("{{NICKNAME}}", nickname)
        .replaceAll("{{CHANNEL}}", channel);
}

function maybeStripLatin(str: string) {
    return settings.store.latinOnly ? str.replace(/[^\x00-\x7F]/g, "") : str;
}

function getNames(userId: string, guildId?: string | null) {
    const user = UserStore.getUser(userId);
    if (!user) return { username: "", displayName: "", nickname: "" };

    const member = guildId ? GuildMemberStore.getMember(guildId, userId) : null;

    return {
        username: maybeStripLatin(user.username),
        displayName: maybeStripLatin(user.globalName || user.username),
        nickname: maybeStripLatin(member?.nick || user.globalName || user.username),
    };
}

function speakFor(template: string, userId: string, channelId?: string | null) {
    const myId = UserStore.getCurrentUser()?.id;
    const isSelf = userId === myId;
    const channel = channelId ? ChannelStore.getChannel(channelId) : null;
    const { username, displayName, nickname } = getNames(userId, channel?.guild_id);

    const userToken = !settings.store.sayOwnName && isSelf ? "" : username;
    const displayToken = !settings.store.sayOwnName && isSelf ? "" : displayName;
    const nickToken = !settings.store.sayOwnName && isSelf ? "" : nickname;

    speak(formatText(template, userToken, displayToken, nickToken, channel?.name ?? ""));
}

const prevSelfStream = new Map<string, boolean>();
const prevViewers = new Map<string, Set<string>>();
const prevMuted = new Map<string, boolean>();

function seedChannelStreamStates(channelId: string) {
    const states = VoiceStateStore.getVoiceStatesForChannel?.(channelId) ?? {};
    for (const [uid, vs] of Object.entries(states)) {
        prevSelfStream.set(uid, !!(vs as any).selfStream);
    }
}

function diffViewers(streamKey: string, viewerIds: string[], channelId: string) {
    const currentSet = new Set(viewerIds);
    const prevSet = prevViewers.get(streamKey) ?? new Set<string>();

    for (const id of currentSet) {
        if (!prevSet.has(id)) speakFor(settings.store.screenShareViewerJoinMessage, id, channelId);
    }

    for (const id of prevSet) {
        if (!currentSet.has(id)) {
            const voiceState = VoiceStateStore.getVoiceStateForUser?.(id);
            if (voiceState?.channelId) {
                speakFor(settings.store.screenShareViewerLeaveMessage, id, channelId);
            }
        }
    }

    prevViewers.set(streamKey, currentSet);
}

function checkStreamViewers() {
    const stream = ApplicationStreamingStore.getCurrentUserActiveStream?.();
    if (!stream) {
        prevViewers.clear();
        return;
    }

    const curChanId = SelectedChannelStore.getVoiceChannelId();
    if (!curChanId) return;

    const viewerIds: string[] = ApplicationStreamingStore.getViewerIds?.(stream) ?? [];
    const key: string = stream.streamKey ?? `${stream.ownerId}:${stream.channelId}`;
    diffViewers(key, viewerIds, curChanId);
}

export default definePlugin({
    name: "VcNarrator",
    description: "Announces when users join, leave, or move voice channels via text to speech. Also announces screen share start, stop, and viewer join/leave events.",
    authors: [Devs.Ven, Devs.smuki],
    settings,

    settingsAboutComponent({ tempSettings: s }) {
        const [hasVoices, hasEnglishVoices] = useMemo(() => {
            const voices = speechSynthesis.getVoices();
            return [voices.length !== 0, voices.some(v => v.lang.startsWith("en"))];
        }, []);

        return (
            <Forms.FormSection>
                <Forms.FormText>
                    You can customise the spoken messages below. You can disable specific messages by setting them to nothing.
                </Forms.FormText>
                <Forms.FormText className={Margins.top8}>
                    <code>{"{{USER}}"}</code>, <code>{"{{DISPLAY_NAME}}"}</code>, <code>{"{{NICKNAME}}"}</code> and <code>{"{{CHANNEL}}"}</code>{" "}
                    will be replaced with the user's name (nothing if it's yourself), the user's display name, the user's nickname on current server and the channel's name respectively
                </Forms.FormText>
                {hasVoices && (
                    <>
                        <Forms.FormTitle className={Margins.top20} tag="h3">Play Example Sounds</Forms.FormTitle>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                            {messageTypes.map(t => (
                                <Button key={t} size={Button.Sizes.SMALL} onClick={() => playSample(s, t)}>
                                    {toLabel(t)}
                                </Button>
                            ))}
                        </div>
                    </>
                )}
            </Forms.FormSection>
        );
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myId = UserStore.getCurrentUser()?.id;
            const curChanId = SelectedChannelStore.getVoiceChannelId();

            if (!curChanId) return;

            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId, selfStream } = state;
                const isMe = userId === myId;

                if (channelId !== curChanId && oldChannelId !== curChanId) continue;

                const isDifferentChannel = channelId !== oldChannelId;

                if (isDifferentChannel) {
                    if (!oldChannelId) {
                        if (isMe) {
                            seedChannelStreamStates(channelId!);
                            prevMuted.set(userId, !!(state.selfMute || state.mute));
                        } else {
                            prevSelfStream.set(userId, !!(selfStream));
                        }
                        speakFor(settings.store.joinMessage, userId, channelId);
                    } else if (!channelId) {
                        speakFor(settings.store.leaveMessage, userId, oldChannelId);
                        prevSelfStream.delete(userId);
                        if (isMe) prevMuted.delete(userId);
                    } else {
                        speakFor(settings.store.moveMessage, userId, channelId);
                        if (isMe) seedChannelStreamStates(channelId!);
                    }
                    continue;
                }

                if (isMe) {
                    const nowMuted = !!(state.selfMute || state.mute);
                    if (prevMuted.has(userId) && prevMuted.get(userId) !== nowMuted) {
                        speakFor(nowMuted ? settings.store.muteMessage : settings.store.unmuteMessage, myId!, channelId!);
                    }
                    prevMuted.set(userId, nowMuted);
                }

                if (selfStream !== undefined) {
                    const hadPrev = prevSelfStream.has(userId);
                    const prevStream = prevSelfStream.get(userId) ?? false;

                    if (!isMe && hadPrev) {
                        if (selfStream && !prevStream)
                            speakFor(settings.store.screenShareStartMessage, userId, channelId ?? curChanId);
                        if (!selfStream && prevStream)
                            speakFor(settings.store.screenShareStopMessage, userId, oldChannelId ?? curChanId);
                    }

                    prevSelfStream.set(userId, selfStream);
                }
            }
        },

        AUDIO_TOGGLE_SELF_DEAF() {
            const myId = UserStore.getCurrentUser()?.id;
            if (!myId) return;
            const s = VoiceStateStore.getVoiceStateForUser?.(myId);
            if (!s?.channelId) return;

            const isDeafened = s.deaf || s.selfDeaf;
            speakFor(isDeafened ? settings.store.deafenMessage : settings.store.undeafenMessage, myId, s.channelId);
        },
    },

    start() {
        if (typeof speechSynthesis !== "undefined") {
            ApplicationStreamingStore.addChangeListener(checkStreamViewers);
        }

        const curChanId = SelectedChannelStore.getVoiceChannelId();
        if (curChanId) seedChannelStreamStates(curChanId);
    },

    stop() {
        ApplicationStreamingStore.removeChangeListener(checkStreamViewers);
        prevSelfStream.clear();
        prevViewers.clear();
        prevMuted.clear();
        speechSynthesis.cancel();
    },
});