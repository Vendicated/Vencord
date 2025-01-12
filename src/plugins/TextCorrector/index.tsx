/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { TextCorrectorChatBarIcon } from "./components/ChatBarButton";
import { settings } from "./settings";
import { correctText } from "./utils";

export default definePlugin({
    name: "TextCorrector",
    description: "Automatically correct your messages using OpenAI or LanguageTool before sending.",
    authors: [Devs.Naseem],
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"],
    settings,

    start() {
        let tooltipTimeout: any;

        const preSendListener = addPreSendListener(async (_, message) => {
            if (!settings.store.autoCorrect || !settings.store.apiKey || !message.content) return;

            const correctedText = await correctText(message.content, settings.store.apiKey);
            if (correctedText !== message.content) {
                message.content = correctedText;
            }
        });

        this.preSendListener = preSendListener;

        addChatBarButton("text-corrector-toggle", TextCorrectorChatBarIcon);

        this.tooltipTimeout = tooltipTimeout;
    },

    stop() {
        removePreSendListener(this.preSendListener);
        removeChatBarButton("text-corrector-toggle");
    },
});
