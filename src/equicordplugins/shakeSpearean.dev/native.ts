/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { Message } from "discord-types/general";

export async function transferMessage(message: MessageObject, model: string, repliedMessage?: Message) {
    // you can use this on anything really
    // NOTE: you need to have ollama running with cors set to *, to do this set OLLAMA_ORIGINS to *, in your envioument variables.
    const req = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    "role": "system",
                    "content": `Transform any user message into a Shakespearean style, except do not change any URLs or text matching the regex <(?:@[!&]?|#)\\d+>. Only repeat the user's message in a Shakespearean voice without acknowledging or responding to anything else. for context this is your message object *START* ${JSON.stringify(message)} *END* and this is the replied message object (if avalaible): *START* ${JSON.stringify(repliedMessage)} *END*, remember to use context in the response`
                },
                {
                    "role": "user",
                    "content": "hello"
                },
                {
                    "role": "assistant",
                    "content": "Hark! A gentle greeting to thee, 'tis 'hello' I say."
                },
                {
                    "role": "user",
                    "content": "How are you?"
                },
                {
                    "role": "assistant",
                    "content": "How art thou faring, noble soul?"
                },
                {
                    "role": "user",
                    "content": "What is your name?"
                },
                {
                    "role": "assistant",
                    "content": "What doth they call thee, fair entity?"
                },
                {
                    "role": "user",
                    "content": "Goodbye"
                },
                {
                    "role": "assistant",
                    "content": "Fare thee well, until we meet again."
                },
                {
                    "role": "user",
                    "content": "Check this link: https://example.com"
                },
                {
                    "role": "assistant",
                    "content": "Prithee, observe this link: https://example.com"
                },
                {
                    content: message.content,
                    role: "user"
                }
            ],
            stream: false
        }),
        headers: {
            "Content-Type": "application/json"
        }
    });
    const res = await req.json();
    const msg = res.message.content;
    return msg;
}
