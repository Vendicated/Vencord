/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    addPreSendListener,
    removePreSendListener,
    SendListener,
} from "@api/MessageEvents";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

const getPresend = dictionary => {
    const presendObject: SendListener = (_, msg) => {
        msg.content = msg.content.trim();
        if (!msg.content.includes("```") && /\w/.test(msg.content.charAt(0))) {
            const re = new RegExp(
                `(^|(?<=[^A-Z0-9]+))(${Object.keys(dictionary)
                    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
                    .join("|")})((?=[^A-Z0-9]+)|$)`,
                "gi"
            );
            if (re !== null) {
                msg.content = msg.content.replace(re, match => {
                    return dictionary[match.toLowerCase()] || match;
                });
            }

            if (/[A-Z0-9]/i.test(msg.content.charAt(msg.content.length - 1))) {
                if (!msg.content.startsWith("http", msg.content.lastIndexOf(" ") + 1))
                    msg.content += ".";
            }

            // Ensure sentences are capitalized after punctuation
            msg.content = msg.content.replace(/([.!?])\s*(\w)/g, match =>
                match.toUpperCase()
            );

            // Ensure the first character of the entire message is capitalized
            if (!msg.content.startsWith("http")) {
                msg.content =
                    msg.content.charAt(0).toUpperCase() + msg.content.slice(1);
            }
        }
    };
    return presendObject;
};

export default definePlugin({
    name: "GrammarFix",
    description: "Automatic punctuation, capitalization, and word replacement.",
    authors: [EquicordDevs.unstream],
    dependencies: ["MessageEventsAPI"],
    async start() {
        let dictionary = await fetch(
            "https://raw.githubusercontent.com/wont-stream/dictionary/3d52fecd9aca5dfee0fcde0df2c2af357f977df7/index.min.json"
        );
        dictionary = await dictionary.json();

        addPreSendListener(getPresend(dictionary));
    },
    stop() {
        removePreSendListener(getPresend({}));
    },
});
