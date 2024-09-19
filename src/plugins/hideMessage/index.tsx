/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addButton, removeButton } from "@api/MessagePopover";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore } from "@webpack/common";
import { get, set } from "@api/DataStore";

let style: HTMLStyleElement;

const KEY = "HideMessage_HiddenMessages";

let hiddenMessages: Set<string> = new Set();
const getHiddenMessages = () => get(KEY).then(set => {
    hiddenMessages = set ?? new Set<string>();
    return hiddenMessages;
});
const saveHiddenMessages = (ids: Set<string>) => set(KEY, ids);

const HideIcon = () => {
    return <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-labelledby="eyeCrossedIconTitle" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" fill="none" color="currentColor">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
        <path d="M22 12C22 12 19 18 12 18C5 18 2 12 2 12C2 12 5 6 12 6C19 6 22 12 22 12Z"></path><circle cx="12" cy="12" r="3"></circle><path d="M3 21L20 4"></path></g>
    </svg>;
};

export default definePlugin({
    name: "HideMessage",
    description: "Adds an option to hide messages",
    authors: [Devs.Isaac],
    dependencies: ["MessagePopoverAPI"],
    options: {
        showMessageHiddenText: {
            description: `Hidden messages will contain a small text indicating they're hidden.`,
            type: OptionType.BOOLEAN,
            default: true
        },
    },

    async start() {
        style = document.createElement("style");
        style.id = "VencordHideMessage";
        document.head.appendChild(style);

        await getHiddenMessages();
        await this.buildCss();

        addButton("HideMessage", msg => {
            const label = "Hide Message";

            return {
                label,
                icon: HideIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => this.toggleHide(`{"channelId": "${msg.channel_id}", "messageId": "${msg.id}"}`)
            };
        });
    },

    stop() {
        removeButton("HideMessage");
    },

    async buildCss() {
        const chatMessages = [...hiddenMessages].map(ids => `#chat-messages-${JSON.parse(ids).channelId}-${JSON.parse(ids).messageId}`).join(",");
        const messagesContent = [...hiddenMessages].map(ids => `#message-content-${JSON.parse(ids).messageId}`).join(",");
        const messagesAccessories = [...hiddenMessages].map(ids => `#message-accessories-${JSON.parse(ids).messageId}`).join(",");
        style.textContent = `
        :is(${chatMessages}) :is([class*="message_d5deea"]) :is([class*="embedWrapper"], [class*="clickableSticker"]) {
            display: none !important;
        }
        :is(${messagesContent}) {
            visibility: hidden;
        }
        :is(${messagesAccessories}) {
            display: none !important;
        }
        `;
        if (Settings.plugins.HideMessage.showMessageHiddenText) { 
            style.textContent += `
            :is(${messagesContent})::after {
                visibility: visible;
                content: "Message hidden" !important;
                color: var(--text-muted);
                font-size: 80%;
                position: absolute;
                display: block;
                top: 0;
            }
        `}
    },

    async toggleHide(sentIds: string) {
        const ids = await getHiddenMessages();
        if (!ids.delete(sentIds))
            ids.add(sentIds);

        await saveHiddenMessages(ids);
        await this.buildCss();
    }
});
