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

import { definePluginSettings } from "@api/settings";
import { makeRange } from "@components/PluginSettings/components/SettingSliderComponent";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";

const MessageCreator = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");

const wait = (s: number) => new Promise(res => setTimeout(res, s * 1000.0));

enum SplitPlace {
    Newline = 0,
    LastCharacter = 1,
}

enum PremiumType {
    None = 0,
    NitroClassic = 1,
    Nitro = 2,
    NitroBasic = 3,
}

function getMaxMessageLength(premiumType: PremiumType): number {
    switch (premiumType) {
        case PremiumType.Nitro:
            return 4000;
        default:
            return 2000;
    }
}

function intoChunks(messageContent: string, maxMessageSize: number, splitPlace: SplitPlace): string[] {
    if (messageContent.length <= maxMessageSize) return [messageContent];
    var chunks: string[];
    switch (splitPlace) {
        case SplitPlace.Newline:
            chunks = [""];
            const lines = messageContent.split("\n");
            for (const line of lines) {
                const idx = chunks.length - 1;
                if (chunks[idx].length + line.length <= maxMessageSize) {
                    chunks[idx] += line;
                    if (chunks[idx].length < maxMessageSize) chunks[idx] += "\n";
                } else if (line.length > maxMessageSize) {
                    var slicepoint = maxMessageSize - chunks[idx].length;
                    chunks[idx] += line.slice(0, slicepoint);
                    intoChunks(line.slice(slicepoint), maxMessageSize, SplitPlace.LastCharacter)
                        .forEach(m => chunks.push(m));
                    chunks[chunks.length - 1] += "\n";
                } else {
                    chunks.push(line);
                }
            }
            break;
        case SplitPlace.LastCharacter:
            chunks = [];
            for (let idx = 0; idx < messageContent.length; idx += maxMessageSize) {
                console.log(idx);
                chunks.push(messageContent.slice(idx, idx + maxMessageSize));
            }
            break;
    }
    chunks = chunks.map(e => e.trimStart().trimEnd());
    return chunks;
}

function sendMessage(channelId: BigInt | string, messageContent: string) {
    const message = {
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        content: messageContent
    };
    MessageCreator.sendMessage(channelId, message, void 0);
}

async function sendMessages(channelId: BigInt | string, messageContents: string[], delay: number) {
    for (const messageContent of messageContents) {
        sendMessage(channelId, messageContent);
        await wait(delay);
    }
}

const settings = definePluginSettings({
    splitPlace: {
        description: "Where the message is split.",
        type: OptionType.SELECT,
        options: [
            {
                label: "On newline, falls back onto the other method if a line is too long. (default)",
                value: SplitPlace.Newline,
                default: true,
            },
            {
                label: "On last possible character, crams everything into smallest amount of possible messages.",
                value: SplitPlace.LastCharacter,
            }
        ],
    },
    delay: {
        description: "Delay between messages in seconds, lower on your own risk.",
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.2,
        stickToMarkers: false
    }
});

export default definePlugin({
    name: "Split Large Messages",
    description: "Splits larger than allowed messages into chunks and sends them in seperate messages.",
    authors: [
        {
            id: 174134334628823041n,
            name: "Pièrre",
        }
    ],
    settings,
    patches: [
        {
            find: ".MESSAGE_TOO_LONG",
            replacement: {
                match: /;if\(\i\.length>\i\){\i&&null(?<=function\s\i\((\i)\).+?;if\((\i\.length>\i)\)({\i&&null))/,
                replace: ";if(($2)&&($1.type.analyticsName!=\"normal\"))$3"
            }
        },
        {
            find: ".PREMIUM_MESSAGE_LENGTH_CHATBOX_FLAIR.format",
            replacement: {
                match: /,{children:\w+}\)\)}}\)]}\)(?<=function\s\w+\((\w+)\){var \w+,(\w+)=\w+\.type,(\w+)=\w+.textValue[.\s\S]+?,{children:(\w+)}\)\)}}\)]}\))/,
                replace: ",{children:$2.analyticsName===\"normal\"?$3.length:$4}))}})]})"
            }
        }
    ],
    start() {
        Vencord.Api.MessageEvents.addPreSendListener((channelId, message, _extra) => {
            const maxMessageLength = getMaxMessageLength(UserStore.getCurrentUser().premiumType ?? PremiumType.None);
            if (message.content.length <= maxMessageLength) return;

            var chunked = intoChunks(message.content, maxMessageLength, settings.store.splitPlace);
            sendMessages(channelId, chunked, Math.max(settings.store.delay, getCurrentChannel().rateLimitPerUser ?? 0));
            // The rateLimitPerUser can cause issues in channels with big cooldowns, altho it is kinda funny if that would happen :)

            message.content = "This message should'nt exist lmao.";
            return { cancel: true };
        });
    },
});
