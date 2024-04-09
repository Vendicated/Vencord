/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";


let listener: SendListener;
const DEFAULT_END_CHAR: string = "⠀";

const settings = definePluginSettings({
    endChar: {
        name: "End Character",
        description: `The character that will be added to the end of messages. (DEFAULT: "${DEFAULT_END_CHAR}")`,
        type: OptionType.STRING,
        default: DEFAULT_END_CHAR,
    },
});

export default definePlugin({
    name: "Small Emojis",
    description: "Append a character to the end, so that messages that only contain emojis have a smaller height.",
    authors: [Devs.GOLD],

    settings,

    start() {
        listener = Vencord.Api.MessageEvents.addPreSendListener((_, data) => {
            // Check if the message is empty
            if (!data.content || data.content.trim().length === 0) return;

            // Check if the message contains an url
            if (data.content.match(/https?:\/\/[^\s]+/)) return;

            data.content += settings.store.endChar;
        });
    },

    stop() {
        Vencord.Api.MessageEvents.removePreSendListener(listener);
    }
});
