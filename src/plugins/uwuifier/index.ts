/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findOption } from "@api/Commands";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    uwuifyMyMessages: {
        type: OptionType.BOOLEAN,
        description: "Automatically uwuify all of your outgoing messages",
        default: false,
        restartNeeded: false
    },
    intensity: {
        type: OptionType.SELECT,
        description: "How aggressive the uwu is",
        options: [
            { label: "Soft uwu", value: "soft", default: true },
            { label: "Normal uwu", value: "normal" },
            { label: "MAXIMUM UWU", value: "max" }
        ],
        restartNeeded: false
    }
});

function uwuify(text: string, mode: string): string {
    let out = text
        .replace(/r/g, "w")
        .replace(/l/g, "w")
        .replace(/R/g, "W")
        .replace(/L/g, "W")
        .replace(/n([aeiou])/g, "ny$1")
        .replace(/N([aeiou])/g, "Ny$1")
        .replace(/th/g, "f")
        .replace(/Th/g, "F")
        .replace(/TH/g, "F")
        .replace(/!+/g, "!!")
        .replace(/\.+/g, ".")
        .replace(/\b(no|know)\b/gi, "nu")
        .replace(/\blove\b/gi, "wuv")
        .replace(/\b(you|u)\b/gi, "uu");

    if (mode !== "soft") {
        out = out.replace(/\b(and|&)\b/gi, "&")
            .replace(/\./g, " uwu. ")
            .replace(/\?/g, " owo? ")
            .replace(/!/g, " >w<!! ");
    }
    if (mode === "max") {
        out = out.replace(/ /g, " ").replace(/\./g, "!!")
            .replace(/owo\?/g, "OWO??")
            .replace(/>w<!!/g, ">w<!!!");
        out = "hehe~ " + out + " uwu~";
    }
    return out;
}

export default definePlugin({
    name: "UwUifier",
    description: "hehe~ turns evewything into uwu speak owo",
    authors: [Devs.Ven, Devs.Claw],
    settings,

    commands: [
        {
            name: "uwu",
            description: "UwUify some text",
            options: [
                {
                    name: "text",
                    description: "Text to uwuify",
                    required: true,
                    type: 3
                }
            ],
            execute: args => {
                const text = findOption(args, "text", "") as string;
                return { content: uwuify(text, settings.store.intensity) };
            }
        }
    ],

    start() {
        this.preSend = addMessagePreSendListener((_channelId, message) => {
            if (!settings.store.uwuifyMyMessages) return;
            if (message.content && !message.content.startsWith("/")) {
                message.content = uwuify(message.content, settings.store.intensity);
            }
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
    }
});
