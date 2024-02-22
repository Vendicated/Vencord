/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const change = async (_, message) => {
    if (!message.content) return;
    message.content = message.content
        .replace(/\b([dn]iggers?)\b/gi, function (match) {
            return match.replace(/./g, function (char, index) {
                if (match[index] === "d") return "n";
                if (match[index] === "D") return "N";
                if (match[index] === "n") return "d";
                if (match[index] === "N") return "D";
                return match[index];
            });
        })
        .replace(/\b([dn]iggas?)\b/gi, function (match) {
            return match.replace(/./g, function (char, index) {
                if (match[index] === "d") return "n";
                if (match[index] === "D") return "N";
                if (match[index] === "n") return "d";
                if (match[index] === "N") return "D";
                return match[index];
            });
        });
};

export default definePlugin({
    name: "NoMoreRacism",
    description: "Helps you no longer be a racist",
    authors: [Devs.TechFun],
    dependencies: ["MessageEventsAPI"],
    start: () => {
        addPreSendListener(change);
    },
    stop: () => {
        removePreSendListener(change);
    }
});
