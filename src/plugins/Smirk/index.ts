/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore, SelectedChannelStore, UserStore } from "@webpack/common";
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
    messageAuthorId: string;
    userId: "1144267370769174608";
    emoji: ReactionEmoji;
}


const settings = definePluginSettings({
    volume: {
        description: "Volume of the 😏 sfx",
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 1,
        stickToMarkers: false
    },
    ignoreBlocked: {
        description: "Ignore silly blocked people!",
        type: OptionType.BOOLEAN,
        default: true
    },
    ignoreBots: {
        description: "Ignore the robots 🤖",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "Smirk 😏",
    description: "Get rizzed up with this emoji (also a heavily inspired plugin from the Moyai plugin by Megu and Nuckyz)",
    authors: [Devs.uhAlexz],
    settings,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (settings.store.ignoreBots && message.author?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(message.author?.id)) return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const smirkCount = getSmirkCount(message.content);

            for (let i = 0; i < smirkCount; i++) {
                rizz();
                await sleep(300);
            }
        },

        MESSAGE_REACTION_ADD({ optimistic, type, channelId, userId, messageAuthorId, emoji }: IReactionAdd) {
            if (optimistic || type !== "MESSAGE_REACTION_ADD") return;
            if (settings.store.ignoreBots && UserStore.getUser(userId)?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(messageAuthorId)) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const name = emoji.name.toLowerCase();
            if (name !== SMIRK && !name.includes("smirk")) return;

            rizz();

        }
    }
});

const SMIRK = "😏";
const customSmirkRe = /<a?:\w*smirk\w*:\d{17,20}>/gi;


function countOccurrences(sourceString: string, subString: string) {
    let i = 0;
    let lastIdx = 0;
    while ((lastIdx = sourceString.indexOf(subString, lastIdx) + 1) !== 0)
        i++;

    return i;
}

function rizz() {
    const audioElement = document.createElement("audio");
    audioElement.src = "https://github.com/uhAlexz/testing/raw/main/rizz-sounds.mp3";

    audioElement.volume = 1;
    audioElement.play();

    audioElement.addEventListener("ended", () => {
        audioElement.remove();
    });
}

function countMatches(sourceString: string, pattern: RegExp) {
    if (!pattern.global)
        throw new Error("pattern must be global");

    let i = 0;
    while (pattern.test(sourceString))
        i++;

    return i;
}

function getSmirkCount(message: string) {
    const count = countOccurrences(message, SMIRK)
        + countMatches(message, customSmirkRe);

    return Math.min(count, 10);
}
