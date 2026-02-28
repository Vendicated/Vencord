/*
 * LlamaScribe - AI Grammar & Style
 * Copyright (c) 2026 Caeden
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin from "@utils/types";
import { OptionType } from "@utils/types";
import { Logger } from "@utils/Logger";

const logger = new Logger("LlamaScribe");

const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "Your Groq API Key (free from https://console.groq.com/keys). Required for the plugin to work.",
        default: "",
    },
    model: {
        type: OptionType.SELECT,
        description: "AI Model Preference",
        options: [
            { label: "Llama 3.1 8B (Fast)", value: "llama-3.1-8b-instant" },
            { label: "Llama 3.1 70B (Smarter)", value: "llama-3.1-70b-versatile" },
        ],
        default: "llama-3.1-8b-instant",
    }
});


let styleElement: HTMLStyleElement | null = null;

export default definePlugin({
    name: "LlamaScribe",
    description: "Instant AI text improvement. Press Alt + G. Requires a Groq API Key.",
    authors: [{ name: "Caeden", id: 832663333529845772n }],
    settings,

    start() {

        styleElement = document.createElement("style");
        styleElement.id = "LlamaScribe-Styles";
        styleElement.innerHTML = `
            @keyframes polished-pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; filter: grayscale(1); }
                100% { opacity: 1; }
            }
            .polishing-active {
                animation: polished-pulse 1.5s infinite ease-in-out;
                pointer-events: none;
            }
        `;
        document.head.appendChild(styleElement);

        window.addEventListener("keydown", this.handleKeyDown, true);
    },

    stop() {
        styleElement?.remove();
        window.removeEventListener("keydown", this.handleKeyDown, true);
    },

    handleKeyDown: async (e: KeyboardEvent) => {
        if (e.altKey && e.key.toLowerCase() === "g") {
            const target = e.target as HTMLElement;
            if (!target || !target.isContentEditable) return;

            const text = target.innerText;
            if (!text || text.trim().length < 2) return;

            const apiKey = settings.store.apiKey;
            if (!apiKey) {
                logger.error("Set your Groq API Key in settings!");
                return;
            }

            e.preventDefault();
            e.stopImmediatePropagation();

            try {
                target.classList.add("polishing-active");

                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: settings.store.model,
                        messages: [
                            {
                                role: "system",
                                content: "You are a text-polishing engine. Output ONLY the corrected text. No conversational filler or quotes."
                            },
                            { role: "user", content: text }
                        ],
                        temperature: 0
                    })
                });

                const data = await response.json();
                target.classList.remove("polishing-active");

                let fixedText = data.choices[0].message.content.trim().replace(/^"|"$/g, '');
                if (!fixedText || fixedText === text) return;

                target.focus();
                const range = document.createRange();
                range.selectNodeContents(target);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);

                const dataTransfer = new DataTransfer();
                dataTransfer.setData('text/plain', fixedText);

                const pasteEvent = new ClipboardEvent('paste', {
                    clipboardData: dataTransfer,
                    bubbles: true,
                    cancelable: true
                });

                target.dispatchEvent(pasteEvent);
                target.dispatchEvent(new Event('input', { bubbles: true }));

            } catch (err) {
                target.classList.remove("polishing-active");
                logger.error("Polished failed:", err);
            }
        }
    }
});