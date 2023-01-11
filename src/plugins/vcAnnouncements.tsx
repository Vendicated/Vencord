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

import { Settings } from "@api/settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, FluxDispatcher, Forms, Margins, SelectedChannelStore, UserStore } from "@webpack/common";

function speak(text: string) {
    const speech = new SpeechSynthesisUtterance(text);
    let voice = speechSynthesis.getVoices().find(v => v.voiceURI === Settings.plugins.VcAnnouncements.voice);
    if (!voice) {
        new Logger("VcAnnouncements").error(`Voice "${Settings.plugins.VcAnnouncements.voice}" not found. Resetting to default.`);
        voice = speechSynthesis.getVoices().find(v => v.default);
        Settings.plugins.VcAnnouncements.voice = voice?.voiceURI;
        if (!voice) return; // FIXME
    }
    speech.voice = voice!;
    speechSynthesis.speak(speech);
}

function interpolate(str: string, user: string, channel: string) {
    return str
        .replaceAll("{{USER}}", user)
        .replaceAll("{{CHANNEL}}", channel);
}

interface VoiceState {
    userId: string;
    channelId: string;
    oldChannelId: string;
}

function getVoices() {
    const voices = speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang.startsWith("en"));
    return !englishVoices.length ? voices : englishVoices;
}


function getTypeAndChannelId(oldChannel?: string, newChannel?: string) {
    if (newChannel) return [oldChannel ? "moveMessage" : "joinMessage", newChannel];
    if (oldChannel) return ["leaveMessage", oldChannel];
    return ["", ""];
}

function handleVoiceStates({ voiceStates }: { voiceStates: VoiceState[]; }) {
    const myChanId = SelectedChannelStore.getVoiceChannelId();
    const myId = UserStore.getCurrentUser().id;

    for (const { channelId, oldChannelId, userId } of voiceStates) {
        const isMe = userId === myId;
        if (!isMe) {
            if (!myChanId) continue;
            if (channelId !== myChanId && oldChannelId !== myChanId) continue;
        }

        const [type, id] = getTypeAndChannelId(oldChannelId, channelId);
        if (!type) continue;

        const user = isMe ? "" : UserStore.getUser(userId).username;
        const channel = ChannelStore.getChannel(id).name;

        speak(interpolate(Vencord.Settings.plugins.VcAnnouncements[type], user, channel));
    }
}

function playSample(settings: any, type: string) {
    const user = UserStore.getCurrentUser().username;

    const text = interpolate(settings[type] ?? Settings.plugins.VcAnnouncements[type], user, "general");
    const speech = new SpeechSynthesisUtterance(text);
    if (settings.voice) {
        speech.voice = speechSynthesis.getVoices().find(v => v.voiceURI === settings.voice)!;
    }
    speechSynthesis.speak(speech);
}

console.log("getVoices", getVoices());
export default definePlugin({
    name: "VcAnnouncements",
    description: "TODO",
    authors: [Devs.Ven],

    start() {
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", handleVoiceStates);
    },

    stop() {
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", handleVoiceStates);
    },

    get options() {
        return this.optionsCache ??= {
            joinMessage: {
                type: OptionType.STRING,
                description: "Join Message",
                default: "{{USER}} joined {{CHANNEL}}"
            },
            leaveMessage: {
                type: OptionType.STRING,
                description: "Leave Message",
                default: "{{USER}} left {{CHANNEL}}"
            },
            moveMessage: {
                type: OptionType.STRING,
                description: "Move Message",
                default: "{{USER}} moved to {{CHANNEL}}"
            },
            voice: {
                type: OptionType.SELECT,
                description: "Narrator Voice",
                options: getVoices().map(v => ({
                    label: v.name,
                    value: v.voiceURI,
                    default: v.default
                }))
            }
        } as const;
    },

    settingsAboutComponent({ tempSettings: s }) {
        return (
            <Forms.FormSection>
                <Forms.FormText>You can customise the spoken messages below.</Forms.FormText>
                <Forms.FormText>
                    The special placeholders <code>{"{{USER}}"}</code> and <code>{"{{CHANNEL}}"}</code>{" "}
                    will be replaced with the user's name (nothing if it's yourself) and the channel's name respectively
                </Forms.FormText>
                <Flex className={Margins.marginTop20}>
                    <Button onClick={() => playSample(s, "joinMessage")}>Test Join</Button>
                    <Button onClick={() => playSample(s, "leaveMessage")}>Test Leave</Button>
                    <Button onClick={() => playSample(s, "moveMessage")}>Test Move</Button>
                </Flex>
            </Forms.FormSection>
        );
    }
});
