/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, MessageObject, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    matches: {
        type: OptionType.STRING,
        description: "Domains to replace. Semicolon seperated pairs of urls to replace from and to",
        default: "x.com fxtwitter.com;twitter.com fxtwitter.com",
    }
});

export default definePlugin({
    name: "Fixup links",
    description: "Replaces domains with (configurable) fixup domains for prettier discord embeds",
    authors: [Devs.kodenamekrak],

    settings: settings,

    onMessagePresend(message: MessageObject) {
        const replaces = settings.store.matches.split(";").map(s => s.trim()).filter(s => s.length > 0);
        for(const pair of replaces) {
            const [from, to] = pair.split(" ");
            if(!from || !to)
                return;

            message.content = message.content.replace(`https://${from}`, `https://${to}`);
        }
    },

    start() {
        this.presendListener = addPreSendListener((channelId, message) => this.onMessagePresend(message));
    },

    stop() {
        removePreSendListener(this.presendListener);
    },
});

