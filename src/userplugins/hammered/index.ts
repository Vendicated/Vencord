/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import definePlugin, { OptionType } from "@utils/types";

import { UwuChatBarIcon } from "./hammeredicon";
import { random } from "./hammerer";

export const settings = definePluginSettings({
    spaceChance: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.1,
        description: "Chance to insert spaces into words",
    },
    replaceChance: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.4,
        description: "chance for nearby key replacements",
    },
    autoHammer: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "jfkasdflafhuel"
    }
});
export default definePlugin({
    name: "Hammered",
    description: "makes you sound drunk af!",
    authors: [{ name: "Yande", id: 1014588310036951120n }],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI", "ChatInputButtonAPI"],
    settings,


    start() {


        addChatBarButton("vc-hammer", UwuChatBarIcon);


        this.preSend = addPreSendListener(async (_, message) => {
            if (!message.content || !settings.store.autoHammer) return;

            message.content = random(message.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
        removeChatBarButton("vc-hammer");
    },
});
