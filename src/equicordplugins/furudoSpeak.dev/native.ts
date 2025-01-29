/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { Message } from "discord-types/general";

import Ollama from "./providers/Ollama";
import OpenAI from "./providers/OpenAI";
import { FurudoSettings } from "./types";

export async function transferMessage(
    message: MessageObject,
    settings: FurudoSettings,
    repliedMessage?: Message
) {
    switch (settings.provider) {
        case "openai":
            return await OpenAI(message, settings, repliedMessage);
        case "ollama":
            return await Ollama(message, settings, repliedMessage);
    }
}
