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

import { ErrorCard } from "@components/ErrorCard";
import { Devs, IS_LINUX } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { wordsToTitle } from "@utils/text";
import definePlugin, { ReporterTestable } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, Forms, GuildMemberStore, SelectedChannelStore, SelectedGuildStore, useMemo, UserStore } from "@webpack/common";
import { ReactElement } from "react";

import { getCurrentVoice, settings } from "./settings";

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
}

const VoiceStateStore = findByPropsLazy("getVoiceStatesForChannel", "getCurrentClientVoiceChannelId");

// Mute/Deaf for other people than you is commented out, because otherwise someone can spam it and it will be annoying
// Filtering out events is not as simple as just dropping duplicates, as otherwise mute, unmute, mute would
// not say the second mute, which would lead you to believe they're unmuted

function speak(text: string) {
    if (!text) return;

    const { volume, rate } = settings.store;

    const speech = new SpeechSynthesisUtterance(text);
    const voice = getCurrentVoice();
    speech.voice = voice!;
    speech.volume = volume;
    speech.rate = rate;
    speechSynthesis.speak(speech);
}

function clean(str: string) {
    const replacer = settings.store.latinOnly
        ? /[^\p{Script=Latin}\p{Number}\p{Punctuation}\s]/gu
        : /[^\p{Letter}\p{Number}\p{Punctuation}\s]/gu;

    return str.normalize("NFKC")
        .replace(replacer, "")
        .replace(/_{2,}/g, "_")
        .trim();
}

function formatText(str: string, user: string, channel: string, displayName: string, nickname: string) {
    return str
        .replaceAll("{{USER}}", clean(user) || (user ? "Someone" : ""))
        .replaceAll("{{CHANNEL}}", clean(channel) || "channel")
        .replaceAll("{{DISPLAY_NAME}}", clean(displayName) || (displayName ? "Someone" : ""))
        .replaceAll("{{NICKNAME}}", clean(nickname) || (nickname ? "Someone" : ""));
}

/*
let StatusMap = {} as Record<string, {
    mute: boolean;
    deaf: boolean;
}>;
*/

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

function getTypeAndChannelId({ channelId, oldChannelId }: VoiceState, isMe: boolean) {
    if (isMe && channelId !== myLastChannelId) {
        oldChannelId = myLastChannelId;
        myLastChannelId = channelId;
    }

    if (channelId !== oldChannelId) {
        if (channelId) return [oldChannelId ? "move" : "join", channelId];
        if (oldChannelId) return ["leave", oldChannelId];
    }
    /*
    if (channelId) {
        if (deaf || selfDeaf) return ["deafen", channelId];
        if (mute || selfMute) return ["mute", channelId];
        const oldStatus = StatusMap[userId];
        if (oldStatus.deaf) return ["undeafen", channelId];
        if (oldStatus.mute) return ["unmute", channelId];
    }
    */
    return ["", ""];
}

/*
function updateStatuses(type: string, { deaf, mute, selfDeaf, selfMute, userId, channelId }: VoiceState, isMe: boolean) {
    if (isMe && (type === "join" || type === "move")) {
        StatusMap = {};
        const states = VoiceStateStore.getVoiceStatesForChannel(channelId!) as Record<string, VoiceState>;
        for (const userId in states) {
            const s = states[userId];
            StatusMap[userId] = {
                mute: s.mute || s.selfMute,
                deaf: s.deaf || s.selfDeaf
            };
        }
        return;
    }

    if (type === "leave" || (type === "move" && channelId !== SelectedChannelStore.getVoiceChannelId())) {
        if (isMe)
            StatusMap = {};
        else
            delete StatusMap[userId];

        return;
    }

    StatusMap[userId] = {
        deaf: deaf || selfDeaf,
        mute: mute || selfMute
    };
}
*/

function playSample(type: string) {
    const currentUser = UserStore.getCurrentUser();
    const myGuildId = SelectedGuildStore.getGuildId();

    speak(formatText(
        settings.store[type + "Message"],
        currentUser.username,
        "general",
        currentUser.globalName ?? currentUser.username,
        GuildMemberStore.getNick(myGuildId!, currentUser.id) ?? currentUser.username
    ));
}

export default definePlugin({
    name: "VcNarrator",
    description: "Announces when users join, leave, or move voice channels via narrator",
    authors: [Devs.Ven],
    reporterTestable: ReporterTestable.None,

    settings,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myGuildId = SelectedGuildStore.getGuildId();
            const myChanId = SelectedChannelStore.getVoiceChannelId();
            const myId = UserStore.getCurrentUser().id;

            if (ChannelStore.getChannel(myChanId!)?.type === 13 /* Stage Channel */) return;

            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isMe = userId === myId;
                if (!isMe) {
                    if (!myChanId) continue;
                    if (channelId !== myChanId && oldChannelId !== myChanId) continue;
                }

                const [type, id] = getTypeAndChannelId(state, isMe);
                if (!type) continue;

                const template = settings.store[type + "Message"];
                const user = isMe && !settings.store.sayOwnName ? "" : UserStore.getUser(userId).username;
                const displayName = user && ((UserStore.getUser(userId) as any).globalName ?? user);
                const nickname = user && (GuildMemberStore.getNick(myGuildId!, userId) ?? user);
                const channel = ChannelStore.getChannel(id).name;

                speak(formatText(template, user, channel, displayName, nickname));

                // updateStatuses(type, state, isMe);
            }
        },

        AUDIO_TOGGLE_SELF_MUTE() {
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(chanId) as VoiceState;
            if (!s) return;

            const event = s.mute || s.selfMute ? "unmute" : "mute";
            speak(formatText(settings.store[event + "Message"], "", ChannelStore.getChannel(chanId).name, "", ""));
        },

        AUDIO_TOGGLE_SELF_DEAF() {
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(chanId) as VoiceState;
            if (!s) return;

            const event = s.deaf || s.selfDeaf ? "undeafen" : "deafen";
            speak(formatText(settings.store[event + "Message"], "", ChannelStore.getChannel(chanId).name, "", ""));
        }
    },

    start() {
        if (typeof speechSynthesis === "undefined" || speechSynthesis.getVoices().length === 0) {
            new Logger("VcNarrator").warn(
                "SpeechSynthesis not supported or no Narrator voices found. Thus, this plugin will not work. Check my Settings for more info"
            );
            return;
        }

    },

    settingsAboutComponent() {
        const [hasVoices, hasEnglishVoices] = useMemo(() => {
            const voices = speechSynthesis.getVoices();
            return [voices.length !== 0, voices.some(v => v.lang.startsWith("en"))];
        }, []);

        const types = useMemo(
            () => Object.keys(settings.def).filter(k => k.endsWith("Message")).map(k => k.slice(0, -7)),
            [],
        );

        let errorComponent: ReactElement<any> | null = null;
        if (!hasVoices) {
            let error = "No narrator voices found. ";
            error += IS_LINUX
                ? "Install speech-dispatcher or espeak and run Discord with the --enable-speech-dispatcher flag"
                : "Try installing some in the Narrator settings of your Operating System";
            errorComponent = <ErrorCard>{error}</ErrorCard>;
        } else if (!hasEnglishVoices) {
            errorComponent = <ErrorCard>You don't have any English voices installed, so the narrator might sound weird</ErrorCard>;
        }

        return (
            <Forms.FormSection>
                <Forms.FormText>
                    You can customise the spoken messages below. You can disable specific messages by setting them to nothing
                </Forms.FormText>
                <Forms.FormText>
                    The special placeholders <code>{"{{USER}}"}</code>, <code>{"{{DISPLAY_NAME}}"}</code>, <code>{"{{NICKNAME}}"}</code> and <code>{"{{CHANNEL}}"}</code>{" "}
                    will be replaced with the user's name (nothing if it's yourself), the user's display name, the user's nickname on current server and the channel's name respectively
                </Forms.FormText>
                {hasEnglishVoices && (
                    <>
                        <Forms.FormTitle className={Margins.top20} tag="h3">Play Example Sounds</Forms.FormTitle>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gap: "1rem",
                            }}
                            className={"vc-narrator-buttons"}
                        >
                            {types.map(t => (
                                <Button key={t} onClick={() => playSample(t)}>
                                    {wordsToTitle([t])}
                                </Button>
                            ))}
                        </div>
                    </>
                )}
                {errorComponent}
            </Forms.FormSection>
        );
    }
});
