/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

import { BrainrotOpenButtonChatBar } from "./brainrotIcon";

const pSettings = definePluginSettings({
    typingBrainrot: {
        description: "Do you want random brainrot in your messages? Warning: turns all your messages lowercase. sorry, that's the way of the replace rules",
        default: false,
        type: OptionType.BOOLEAN
    }
});

const loggah = new Logger("brainrot", "red");

export default definePlugin({
    name: "Brainrot",
    description: "get subway surfers as you're lurking in chat",
    authors: [Devs.Freesmart],
    settings: pSettings,

    renderChatBarButton: BrainrotOpenButtonChatBar,
});
