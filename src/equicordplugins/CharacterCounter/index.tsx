/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { UserStore } from "@webpack/common";

let ChannelTextAreaClasses;
let shouldShowColorEffects: boolean;
let position: boolean;
let forceLeft = false;

waitFor(["buttonContainer", "channelTextArea"], m => (ChannelTextAreaClasses = m));

const settings = definePluginSettings({
    colorEffects: {
        type: OptionType.BOOLEAN,
        description: "Turn on or off color effects for getting close to the character limit",
        default: true,
        onChange: value => {
            shouldShowColorEffects = value;
        }
    },
    position: {
        type: OptionType.BOOLEAN,
        description: "Move the character counter to the left side of the chat input",
        default: false,
        onChange: value => {
            position = value;

            const charCounterDiv = document.querySelector(".char-counter");
            if (charCounterDiv) {
                if (value) {
                    charCounterDiv.classList.add("left");
                } else {
                    charCounterDiv.classList.remove("left");
                }
            }
        }
    }
});

export default definePlugin({
    name: "CharacterCounter",
    description: "Adds a character counter to the chat input",
    authors: [EquicordDevs.creations],
    settings: settings,

    start() {
        const premiumType = (UserStore.getCurrentUser().premiumType ?? 0);
        const charMax = premiumType === 2 ? 4000 : 2000;

        shouldShowColorEffects = settings.store.colorEffects;
        position = settings.store.position;

        const addCharCounter = () => {
            const chatTextArea: HTMLElement | null = document.querySelector(`.${ChannelTextAreaClasses?.channelTextArea}`);
            if (!chatTextArea) return;

            let charCounterDiv: HTMLElement | null = document.querySelector(".char-counter");
            if (!charCounterDiv) {
                charCounterDiv = document.createElement("div");
                charCounterDiv.classList.add("char-counter");

                if (position || forceLeft) charCounterDiv.classList.add("left");

                charCounterDiv.innerHTML = `<span class="char-count">0</span>/<span class="char-max">${charMax}</span>`;
            }

            const chatInputContainer: HTMLElement | null = chatTextArea.closest("form");
            if (chatInputContainer && !chatInputContainer.contains(charCounterDiv)) {
                chatTextArea.style.display = "flex";
                chatTextArea.style.flexDirection = "column";
                chatCounterPositionUpdate(chatTextArea, charCounterDiv);

                chatTextArea.appendChild(charCounterDiv);
            }

            const chatInput: HTMLElement | null = chatTextArea.querySelector('div[contenteditable="true"]');

            const updateCharCount = () => {
                const text = chatInput?.textContent?.replace(/[\uFEFF\xA0]/g, "") || "";
                const charCount = text.trim().length;
                const charCountSpan: HTMLElement | null = charCounterDiv!.querySelector(".char-count");
                charCountSpan!.textContent = `${charCount}`;

                if (shouldShowColorEffects) {
                    const percentage = (charCount / charMax) * 100;
                    let color;
                    if (percentage < 50) {
                        color = "#888";
                    } else if (percentage < 75) {
                        color = "#ff9900";
                    } else if (percentage < 90) {
                        color = "#ff6600";
                    } else {
                        color = "#ff0000";
                    }
                    charCountSpan!.style.color = color;
                }
            };

            chatInput?.addEventListener("input", updateCharCount);
            chatInput?.addEventListener("keydown", () => setTimeout(updateCharCount, 0));
            chatInput?.addEventListener("paste", () => setTimeout(updateCharCount, 0));
        };

        const chatCounterPositionUpdate = (chatTextArea: HTMLElement, charCounterDiv: HTMLElement) => {
            const position = "flex-end";
            chatTextArea.style.justifyContent = position;
            charCounterDiv.style.position = "absolute";
        };

        const observeDOMChanges = () => {
            const observer = new MutationObserver(() => {
                const chatTextArea = document.querySelector(`.${ChannelTextAreaClasses?.channelTextArea}`);
                if (chatTextArea && !document.querySelector(".char-counter")) {
                    const currentChannel = getCurrentChannel();
                    forceLeft = currentChannel?.rateLimitPerUser !== 0;

                    addCharCounter();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        };

        observeDOMChanges();
    },

    stop() {
        const charCounterDiv = document.querySelector(".char-counter");
        if (charCounterDiv) charCounterDiv.remove();
    }
});
