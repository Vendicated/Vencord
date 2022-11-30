/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
import { makeRange } from "@components/PluginSettings/components/SettingSliderComponent";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, SelectedChannelStore, UserStore } from "@webpack/common";
import { Message, ReactionEmoji } from "discord-types/general";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

interface IReactionAdd {
    type: "MESSAGE_REACTION_ADD";
    optimistic: boolean;
    channelId: string;
    messageId: string;
    userId: "195136840355807232";
    emoji: ReactionEmoji;
}

interface IVoiceChannelEffectSendEvent {
    type: string;
    emoji?: ReactionEmoji; // Just in case...
    channelId: string;
    userId: string;
    animationType: number;
    animationId: number;
}

const MOYAI = "🗿";
const MOYAI_URL =
    "https://raw.githubusercontent.com/MeguminSama/VencordPlugins/main/plugins/moyai/moyai.mp3";

export default definePlugin({
    name: "Moyai",
    authors: [Devs.Megu, Devs.Nuckyz],
    description: "🗿🗿🗿🗿🗿🗿🗿🗿",

    async onMessage(e: IMessageCreate) {
        if (e.optimistic || e.type !== "MESSAGE_CREATE") return;
        if (e.message.state === "SENDING") return;
        if (Settings.plugins.Moyai.ignoreBots && e.message.author?.bot) return;
        if (!e.message.content) return;
        if (e.channelId !== SelectedChannelStore.getChannelId()) return;

        const moyaiCount = getMoyaiCount(e.message.content);

        for (let i = 0; i < moyaiCount; i++) {
            boom();
            await sleep(300);
        }
    },

    onReaction(e: IReactionAdd) {
        if (e.optimistic || e.type !== "MESSAGE_REACTION_ADD") return;
        if (Settings.plugins.Moyai.ignoreBots && UserStore.getUser(e.userId)?.bot) return;
        if (e.channelId !== SelectedChannelStore.getChannelId()) return;

        const name = e.emoji.name.toLowerCase();
        if (name !== MOYAI && !name.includes("moyai") && !name.includes("moai")) return;

        boom();
    },

    onVoiceChannelEffect(e: IVoiceChannelEffectSendEvent) {
        if (!e.emoji?.name) return;
        const name = e.emoji.name.toLowerCase();
        if (name !== MOYAI && !name.includes("moyai") && !name.includes("moai")) return;

        boom();
    },

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", this.onMessage);
        FluxDispatcher.subscribe("MESSAGE_REACTION_ADD", this.onReaction);
        FluxDispatcher.subscribe("VOICE_CHANNEL_EFFECT_SEND", this.onVoiceChannelEffect);
    },

    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.onMessage);
        FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD", this.onReaction);
        FluxDispatcher.unsubscribe("VOICE_CHANNEL_EFFECT_SEND", this.onVoiceChannelEffect);
    },

    options: {
        volume: {
            description: "Volume of the 🗿🗿🗿",
            type: OptionType.SLIDER,
            markers: makeRange(0, 1, 0.1),
            default: 0.5,
            stickToMarkers: false,
        },
        triggerWhenUnfocused: {
            description: "Trigger the 🗿 even when the window is unfocused",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: false,
        },
        ignoreBots: {
            description: "Ignore bots",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: false,
        }
    }
});

function countOccurrences(sourceString: string, subString: string) {
    let i = 0;
    let lastIdx = 0;
    while ((lastIdx = sourceString.indexOf(subString, lastIdx) + 1) !== 0)
        i++;

    return i;
}

function countMatches(sourceString: string, pattern: RegExp) {
    if (!pattern.global)
        throw new Error("pattern must be global");

    let i = 0;
    while (pattern.test(sourceString))
        i++;

    return i;
}

const customMoyaiRe = /<a?:\w*moy?ai\w*:\d{17,20}>/gi;

function getMoyaiCount(message: string) {
    const count = countOccurrences(message, MOYAI)
        + countMatches(message, customMoyaiRe);

    return Math.min(count, 10);
}

function boom() {
    if (!Settings.plugins.Moyai.triggerWhenUnfocused && !document.hasFocus()) return;
    const audioElement = document.createElement("audio");
    audioElement.src = MOYAI_URL;
    audioElement.volume = Settings.plugins.Moyai.volume;
    audioElement.play();
}
