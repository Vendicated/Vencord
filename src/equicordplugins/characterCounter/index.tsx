/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { SelectedChannelStore, SelectedGuildStore, UserStore } from "@webpack/common";

let ChannelTextAreaClasses: Record<string, string> | null = null;
let shouldShowColorEffects: boolean;
let position: boolean;

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

            const charCounterDiv = document.querySelector(".vc-char-counter");
            if (charCounterDiv) {
                if (value) charCounterDiv.classList.add("left");
                else charCounterDiv.classList.remove("left");
            }
        }
    }
});

const updateCharCounterOnChannelChange = async () => {
    await waitForChatInput();
    addCharCounter();
};

const waitForChatInput = async () => {
    return waitFor([`${ChannelTextAreaClasses?.channelTextArea}`], () => document.querySelector(`.${ChannelTextAreaClasses?.channelTextArea}`));
};

const addCharCounter = () => {
    const chatTextArea: HTMLElement | null = document.querySelector(`.${ChannelTextAreaClasses?.channelTextArea}`);
    if (!chatTextArea) return;

    let charCounterDiv: HTMLElement | null = document.querySelector(".vc-char-counter");
    if (!charCounterDiv) {
        charCounterDiv = document.createElement("div");
        charCounterDiv.classList.add("vc-char-counter");

        if (position) charCounterDiv.classList.add("left");

        const premiumType = (UserStore.getCurrentUser().premiumType ?? 0);
        const charMax = premiumType === 2 ? 4000 : 2000;

        charCounterDiv.innerHTML = `<span class="vc-char-count">0</span>/<span class="vc-char-max">${charMax}</span>`;
        charCounterDiv.style.opacity = "0";
    }

    const chatInputContainer: HTMLElement | null = chatTextArea.closest("form");
    if (chatInputContainer && !chatInputContainer.contains(charCounterDiv)) {
        chatTextArea.style.display = "flex";
        chatTextArea.style.flexDirection = "column";
        chatCounterPositionUpdate(chatInputContainer, chatTextArea, charCounterDiv);

        chatTextArea.appendChild(charCounterDiv);
    }

    const chatInput: HTMLElement | null = chatTextArea.querySelector('div[contenteditable="true"]');

    const updateCharCount = () => {
        const text = chatInput?.textContent?.replace(/[\uFEFF\xA0]/g, "") || "";
        const charCount = text.trim().length;

        if (charCount !== 0) charCounterDiv.style.opacity = "1";
        else charCounterDiv.style.opacity = "0";

        const charCountSpan: HTMLElement | null = charCounterDiv!.querySelector(".vc-char-count");
        charCountSpan!.textContent = `${charCount}`;

        const bottomPos = chatInputContainer!.offsetHeight;
        charCounterDiv.style.bottom = `${bottomPos.toString()}px`;

        if (shouldShowColorEffects) {
            const premiumType = (UserStore.getCurrentUser().premiumType ?? 0);
            const charMax = premiumType === 2 ? 4000 : 2000;
            const percentage = (charCount / charMax) * 100;
            let color;
            if (percentage < 50) {
                color = "var(--text-muted)";
            } else if (percentage < 75) {
                color = "var(--yellow-330)";
            } else if (percentage < 90) {
                color = "var(--orange-330)";
            } else {
                color = "var(--red-360)";
            }
            charCountSpan!.style.color = color;
        }
    };

    chatInput?.addEventListener("input", updateCharCount);
    chatInput?.addEventListener("keydown", () => setTimeout(updateCharCount, 0));
    chatInput?.addEventListener("paste", () => setTimeout(updateCharCount, 0));
};

const chatCounterPositionUpdate = (chatInputContainer: HTMLElement, chatTextArea: HTMLElement, charCounterDiv: HTMLElement) => {
    chatTextArea.style.justifyContent = "flex-end";
    charCounterDiv.style.position = "absolute";

    const bottomPos = (chatInputContainer.offsetHeight) - 10; // onload 68px, minus 10 to fix
    charCounterDiv.style.bottom = `${bottomPos.toString()}px`;
};

export default definePlugin({
    name: "CharacterCounter",
    description: "Adds a character counter to the chat input",
    authors: [EquicordDevs.creations, EquicordDevs.Panniku],
    settings: settings,

    start: async () => {
        shouldShowColorEffects = settings.store.colorEffects;
        position = settings.store.position;

        waitFor(["buttonContainer", "channelTextArea"], m => (ChannelTextAreaClasses = m));
        await updateCharCounterOnChannelChange();

        SelectedChannelStore.addChangeListener(updateCharCounterOnChannelChange);
        SelectedGuildStore.addChangeListener(updateCharCounterOnChannelChange);
    },

    stop() {
        const charCounterDiv = document.querySelector(".vc-char-counter");
        if (charCounterDiv) charCounterDiv.remove();

        SelectedChannelStore.removeChangeListener(updateCharCounterOnChannelChange);
        SelectedGuildStore.removeChangeListener(updateCharCounterOnChannelChange);
    }
});
