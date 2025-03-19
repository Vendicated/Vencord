/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { wordsToTitle } from "@utils/text";
import definePlugin, { OptionType, PluginOptionsItem, ReporterTestable } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, Forms, GuildMemberStore, SelectedChannelStore, SelectedGuildStore, showToast, useMemo, UserStore } from "@webpack/common";

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream: boolean;
    selfVideo: boolean;
}

const VoiceStateStore = findByPropsLazy("getVoiceStatesForChannel", "getCurrentClientVoiceChannelId");

const StatusMap: Map<string, VoiceState> = new Map<string, VoiceState>();

const DURATION_START: number = 1;
const DURATION_END: number = 10;
const DURATION_STEP: number = 0.5;

// Mute/Deaf for other people than you is commented out, because otherwise someone can spam it and it will be annoying
// Filtering out events is not as simple as just dropping duplicates, as otherwise mute, unmute, mute would
// not say the second mute, which would lead you to believe they're unmuted

function notify(text: string, settings: any = Settings.plugins.VcNotify) {
    if (!text) return;
    showToast(text, "message", {
        duration: settings.messageDuration * 1000,
    });
}

function notifySample(tempSettings: any, type: string) {
    const settings = Object.assign({}, Settings.plugins.VcNotify, tempSettings);
    const currentUser = UserStore.getCurrentUser();
    const myGuildId = SelectedGuildStore.getGuildId();

    notify(formatText(settings[type + "Message"], currentUser.username, "general", (currentUser as any).globalName ?? currentUser.username, GuildMemberStore.getNick(myGuildId, currentUser.id) ?? currentUser.username), settings);
}

function formatText(str: string, user: string, channel: string, displayName: string, nickname: string) {
    return str
        .replaceAll("{{USER}}", user || "")
        .replaceAll("{{CHANNEL}}", channel || "channel")
        .replaceAll("{{DISPLAY_NAME}}", displayName || "")
        .replaceAll("{{NICKNAME}}", nickname || "");
}

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

function getTypeAndChannelId({ userId, channelId, oldChannelId, deaf, mute, selfDeaf, selfMute, selfStream, selfVideo }: VoiceState, isMe: boolean) {
    if (isMe && channelId !== myLastChannelId) {
        oldChannelId = myLastChannelId;
        myLastChannelId = channelId;
    }
    if (channelId !== oldChannelId) {
        if (channelId) return [oldChannelId ? "move" : "join", channelId];
        if (oldChannelId) return ["leave", oldChannelId];
    }
    if (channelId) {
        if (deaf === true || selfDeaf === true) return ["deafen", channelId];
        if (mute === true || selfMute === true) return ["mute", channelId];
        const oldStatus = StatusMap.get(userId);
        if (oldStatus) {
            if (oldStatus.deaf === true) return ["undeafen", channelId];
            if (oldStatus.mute === true) return ["unmute", channelId];
        }
        if (selfStream) return ["stream", channelId];
        if (selfVideo) return ["video", channelId];
    }
    return ["", ""];
}

export default definePlugin({
    name: "VcNotify",
    description: "Announces when users join, leave, or move voice channels via notification toasts",
    authors: [Devs.Tuples],
    reporterTestable: ReporterTestable.None,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myGuildId = SelectedGuildStore.getGuildId();
            const myChanId = SelectedChannelStore.getVoiceChannelId();
            const myId = UserStore.getCurrentUser().id;

            if (ChannelStore.getChannel(myChanId!)?.type === 13 /* Stage Channel */) return;

            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isMe = userId === myId;

                // Check if other user is relevent to the current channel
                if (!isMe) {
                    if (!myChanId) continue;
                    if (channelId !== myChanId && oldChannelId !== myChanId) continue;
                }

                if (isMe) {
                    if (!Settings.plugins.VcNotify.selfNotify) continue;
                }

                const [type, id] = getTypeAndChannelId(state, isMe);

                if (!isMe) {
                    StatusMap.set(userId, state);
                }
                if (!type) continue;

                const template = Settings.plugins.VcNotify[type + "Message"];
                const user = isMe && !Settings.plugins.VcNotify.sayOwnName ? "" : UserStore.getUser(userId).username;
                const displayName = user && ((UserStore.getUser(userId) as any).globalName ?? user);
                const nickname = user && (GuildMemberStore.getNick(myGuildId, userId) ?? user);
                const channel = ChannelStore.getChannel(id).name;

                notify(formatText(template, user, channel, displayName, nickname));
            }
        },

        AUDIO_TOGGLE_SELF_MUTE() {
            if (!Settings.plugins.VcNotify.selfNotify) return;
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(chanId) as VoiceState;
            if (!s) return;

            const event = s.mute || s.selfMute ? "unmute" : "mute";
            notify(formatText(Settings.plugins.VcNotify[event + "Message"], "", ChannelStore.getChannel(chanId).name, "", ""));
        },

        AUDIO_TOGGLE_SELF_DEAF() {
            if (!Settings.plugins.VcNotify.selfNotify) return;
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(chanId) as VoiceState;
            if (!s) return;

            const event = s.deaf || s.selfDeaf ? "undeafen" : "deafen";
            notify(formatText(Settings.plugins.VcNotify[event + "Message"], "", ChannelStore.getChannel(chanId).name, "", ""));
        },
    },

    optionsCache: null as Record<string, PluginOptionsItem> | null,

    get options() {
        return this.optionsCache ??= {
            messageDuration: {
                type: OptionType.SLIDER,
                description: "Notification duration seconds",
                markers: Array.from({ length: (DURATION_END - DURATION_START) / DURATION_STEP + 1 }, (_, i) => 1 + i * DURATION_STEP),
                default: 3000,
            },
            selfNotify: {
                type: OptionType.BOOLEAN,
                description: "Show self update events",
                default: true,
            },
            joinMessage: {
                type: OptionType.STRING,
                description: "Join message",
                default: "{{USER}} joined"
            },
            leaveMessage: {
                type: OptionType.STRING,
                description: "Leave message",
                default: "{{USER}} left"
            },
            moveMessage: {
                type: OptionType.STRING,
                description: "Move message",
                default: "{{USER}} moved to {{CHANNEL}}"
            },
            muteMessage: {
                type: OptionType.STRING,
                description: "Mute message",
                default: "{{USER}} muted"
            },
            unmuteMessage: {
                type: OptionType.STRING,
                description: "Unmute message",
                default: "{{USER}} unmuted"
            },
            deafenMessage: {
                type: OptionType.STRING,
                description: "Deafen message",
                default: "{{USER}} deafened"
            },
            undeafenMessage: {
                type: OptionType.STRING,
                description: "Undeafen message",
                default: "{{USER}} undeafened"
            },
            streamMessage: {
                type: OptionType.STRING,
                description: "Stream started message",
                default: "{{USER}} started streaming"
            },
            videoMessage: {
                type: OptionType.STRING,
                description: "Webcam started message",
                default: "{{USER}} turned on their webcam"
            }
        } satisfies Record<string, PluginOptionsItem>;
    },

    settingsAboutComponent({ tempSettings: s }) {
        const types = useMemo(
            () => Object.keys(Vencord.Plugins.plugins.VcNotify.options!).filter(k => k.endsWith("Message")).map(k => k.slice(0, -7)),
            [],
        );

        return (
            <Forms.FormSection>
                <Forms.FormText>
                    You can customise the messages below. You can disable specific messages by setting them to nothing
                </Forms.FormText>
                <Forms.FormText>
                    The special placeholders <code>{"{{USER}}"}</code>, <code>{"{{DISPLAY_NAME}}"}</code>, <code>{"{{NICKNAME}}"}</code> and <code>{"{{CHANNEL}}"}</code>{" "}
                    will be replaced with the user's name (nothing if it's yourself), the user's display name, the user's nickname on current server and the channel's name respectively
                </Forms.FormText>
                {(
                    <>
                        <Forms.FormTitle className={Margins.top20} tag="h3">Send Example Notification</Forms.FormTitle>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gap: "1rem",
                            }}
                            className={"vc-notify-buttons"}
                        >
                            {types.map(t => (
                                <Button key={t} onClick={() => notifySample(s, t)}>
                                    {wordsToTitle([t])}
                                </Button>
                            ))}
                        </div>
                    </>
                )}
            </Forms.FormSection>
        );
    }
});
