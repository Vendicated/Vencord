/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    totalSize: {
        type: OptionType.NUMBER,
        description: "Total Message Size",
        default: 2000,
        hidden: false
    },
    attack: {
        type: OptionType.BOOLEAN,
        description: "Attack",
        default: false,
        hidden: false
    }
});

const change = async (_, message) => {
    if (!settings.store.attack) return;

    if (!message.content) return;

    message.content = "­".repeat(settings.store.totalSize - message.content.length) + message.content;
};

export default definePlugin({
    name: "FreeStorage",
    description: "Discord is FREE Storage",
    authors: [Devs.TechFun],
    dependencies: ["MessageEventsAPI"],
    patches: [
        {
            // Indicator
            find: ".Messages.MESSAGE_EDITED,",
            replacement: {
                match: /let\{className:\i,message:\i[^}]*\}=(\i)/,
                replace: "try {$1.message.content=$1.message.content.replaceAll('­', '')} catch {};$&"
            }
        },
    ],
    settings,
    start: () => {
        addPreSendListener(change);
    },
    stop: () => {
        removePreSendListener(change);
    }
});
