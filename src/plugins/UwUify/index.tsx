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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { sendMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { getUwuifier, reloadUwuifier } from "./uwuifier";

let pendingUwuify = false;

export const settings = definePluginSettings({
    faces: {
        type: OptionType.BOOLEAN,
        description: "Add cute faces like OwO, UwU, :3 to your messages",
        default: true,
        onChange() {
            reloadUwuifier(settings.store);
        },
    },
    actions: {
        type: OptionType.BOOLEAN,
        description: "Add actions like *blushes*, *cries*, *twerks*",
        default: true,
        onChange() {
            reloadUwuifier(settings.store);
        },
    },
    stutters: {
        type: OptionType.BOOLEAN,
        description: "Add stutters like 'p-p-p-please'",
        default: true,
        onChange() {
            reloadUwuifier(settings.store);
        },
    },
    words: {
        type: OptionType.BOOLEAN,
        description: "Replace r/l with w (e.g. 'very' → 'vewy')",
        default: true,
        onChange() {
            reloadUwuifier(settings.store);
        },
    },
    exclamations: {
        type: OptionType.BOOLEAN,
        description: "Replace exclamation marks with uwu ones (e.g. '!' → '!?')",
        default: false,
        onChange() {
            reloadUwuifier(settings.store);
        },
    },
    convertMessages: {
        type: OptionType.BOOLEAN,
        description: "Automatically uwuify all messages before sending",
        default: true,
    },
});

export default definePlugin({
    name: "UwUify",
    description: "Lets you UwUify text via the /uwuify command or automatically on all your messages",
    authors: [
        {
            name: "meqativ :3",
            id: 744276454946242723n,
        },
    ],
    tags: ["Fun", "Commands", "Chat"],
    settings,

    start() {
        reloadUwuifier(settings.store);
    },

    stop() { },

    commands: [
        {
            name: "uwuify",
            description: "UwUify some text",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "input",
                    description: "Text to be UwUified",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                },
                {
                    name: "send",
                    description: "Send the uwuified text as an actual message in chat (not ephemeral)",
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: false,
                },
            ],
            execute: async (args, ctx) => {
                const input = findOption<string>(args, "input", "");
                const shouldSend = findOption<boolean>(args, "send", false);

                const output = getUwuifier().uwuifySentence(input);

                if (shouldSend) {
                    pendingUwuify = true;
                    try {
                        sendMessage(ctx.channel.id, { content: output });
                    } finally {
                        pendingUwuify = false;
                    }
                } else {
                    sendBotMessage(ctx.channel.id, { content: output });
                }
            },
        },
    ],

    onBeforeMessageSend(_, message) {
        if (!settings.store.convertMessages) return;
        if (pendingUwuify) return;

        message.content = getUwuifier().uwuifySentence(message.content);
    },
});
