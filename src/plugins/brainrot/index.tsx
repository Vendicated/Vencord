/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";

import { BrainrotOpenButtonChatBar } from "./brainrotIcon";

const pSettings = definePluginSettings({
    typingBrainrot: {
        description: "Do you want random brainrot in your messages? Warning: turns all your messages lowercase. sorry, that's the way of the replace rules",
        default: false,
        type: OptionType.BOOLEAN
    }
});

const replaceRules = {
    "shut up": "sybau",
    "annoying": "pmo",
    "yo": "gurt",
    "this": "ts",
    "good": "Owen",
    "mid": "James",
    "real": "Samuel",
    "funny": "Zach",
    "is so": "Blerk",
    "silly": "Greg",
    "job": "...",
};

const loggah = new Logger("brainrot", "red");

export default definePlugin({
    name: "Brainrot",
    description: "get subway surfers as you're lurking in chat",
    authors: [Devs.Freesmart],
    settings: pSettings,

    renderChatBarButton: BrainrotOpenButtonChatBar,

    start() {
        const sMsg = findByProps("sendMessage").sendMessage;

        findByProps("sendMessage").sendMessage = (chID, msg, ...args) => {

            loggah.log("Message found");

            let cont = msg.content;
            if (pSettings.store.typingBrainrot) {
                for (const rule in replaceRules) {
                    cont = cont.toLowerCase().replaceAll(rule, replaceRules[rule]);
                }
            }
            msg.content = cont;

            sMsg(chID, msg, ...args);
        };
    }
});
