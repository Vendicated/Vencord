/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    target: {
        type: OptionType.STRING,
        description: "Text to replace",
        default: "?"
    },
    replace: {
        type: OptionType.STRING,
        description: "Replace with",
        default: ":face_with_monocle:"
    },
});

function replaceText(content: string): string {
    if (!settings.store.target) return content;
    const regex = new RegExp(settings.store.target, "g");
    return content.replace(regex, settings.store.replace);
}

export default definePlugin({
    name: "ReplaceAnything",
    description: "Replace specified text with chosen string.",
    authors: [Devs.smuki],

    settings,

    start() {
        this.preSend = addMessagePreSendListener((_, msg) => {
            msg.content = replaceText(msg.content);
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
    }
});
