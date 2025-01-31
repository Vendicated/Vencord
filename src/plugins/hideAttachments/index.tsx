/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { get, set } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore } from "@webpack/common";

import { ILoadMessagesSuccessPayload, IMessage, IMessageCreatePayload, IMessageUpdatePayload } from "./types";
import { isStringEmpty } from "./utils";

let style: HTMLStyleElement;
const KEY = "HideAttachments_HiddenIds";

let hiddenMessages: Set<string> = new Set();
const getHiddenMessages = () => get(KEY).then(set => {
    hiddenMessages = set ?? new Set<string>();
    return hiddenMessages;
});
const saveHiddenMessages = (ids: Set<string>) => set(KEY, ids);

/**
 * Update CSS
 */
const buildCss = async () => {
    const elements = [...hiddenMessages]
        .map(x => `#message-accessories-${x}`)
        .join(",");

    style.textContent = `
    :is(${elements}) :is([class*="embedWrapper"], [class*="clickableSticker"]) {
        /* important is not necessary, but add it to make sure bad themes won't break it */
        display: none !important;
    }
    :is(${elements})::after {
        content: "Attachments hidden";
        color: var(--text-muted);
        font-size: 80%;
    }
    `;
};

/**
 * Toggle attachment/embed hiding
 */
const toggleHide = async (id: string): Promise<void> => {
    const ids = await getHiddenMessages();
    if (!ids.delete(id))
        ids.add(id);

    await saveHiddenMessages(ids);
    await buildCss();
};

/**
 * Determine if the message should be blocked according to user ID filter
 * @param {Message} payload The message to be checked
 * @param {string[]} userFilters List of user IDs to be checked
 * @returns {boolean}
 */
const shouldHideByUserIdFilter = (payload: IMessage, userFilters: string[]): boolean => {
    for (const id of userFilters) {
        if (payload.author.id === id) {
            return true;
        }
    }

    return false;
};

/**
 * Determine if the message should be blocked according to domain list filter
 * @param {Message} payload The message to be checked
 * @param {string[]} domainList List of domains to be checked
 * @returns {boolean}
 */
const shouldHideByDomainListFilter = (payload: IMessage, domainList: string[]): boolean => {
    if (payload.embeds.length <= 0) {
        return false;
    }

    for (const embed of payload.embeds) {
        if (!embed.url) {
            continue;
        }

        for (const domain of domainList) {
            const host = URL.parse(embed.url)?.hostname ?? "";
            if (host.indexOf(domain) >= 0) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Checks and hides the attachment/embed
 * @param {Message} message The message to check
 * @param {object} store The configuration values
 */
const checkAndHide = async (message: IMessage, store: typeof settings.store): Promise<void> => {
    if (!store.enableAutoHideAttachments) {
        return;
    }

    if (hiddenMessages.has(message.id)) {
        return;
    }

    const userFilters = isStringEmpty(store.filterUserList)
        ? []
        : store.filterUserList.split(",");
    if (shouldHideByUserIdFilter(message, userFilters)) {
        await toggleHide(message.id);
        return;
    }

    const domainFilters = isStringEmpty(store.filterDomainList)
        ? []
        : store.filterDomainList.split(",");
    if (shouldHideByDomainListFilter(message, domainFilters)) {
        await toggleHide(message.id);
        return;
    }

    // Forwarded messages
    // Limitation: User filters don't work on this one.
    if (Array.isArray(message.message_snapshots)) {
        for (const snapshot of message.message_snapshots!) {
            if (shouldHideByDomainListFilter(snapshot.message, domainFilters)) {
                await toggleHide(message.id);
                return;
            }
        }
    }
};

const settings = definePluginSettings({
    enableAutoHideAttachments: {
        type: OptionType.BOOLEAN,
        description: "Enable auto hide attachments",
        default: false,
        restartNeeded: false
    },
    filterUserList: {
        type: OptionType.STRING,
        description: "Comma separated list of User IDs to automatically hide their attachments/embeds",
        default: "",
        restartNeeded: true
    },
    filterDomainList: {
        type: OptionType.STRING,
        description: "Comma separated list of domains to automatically hide their embeds.",
        default: "",
        restartNeeded: true
    }
});

export default definePlugin({
    name: "HideAttachments",
    description: "Hide attachments and Embeds for individual messages via hover button",
    authors: [Devs.Ven, Devs.aiko],

    settings,

    renderMessagePopoverButton(msg: IMessage) {
        const hasAttachmentsInSnapshots = !Array.isArray(msg.message_snapshots);
        if (!msg.attachments.length && !msg.embeds.length && !msg.stickerItems.length && !hasAttachmentsInSnapshots) {
            return null;
        }

        const isHidden = hiddenMessages.has(msg.id);

        return {
            label: isHidden ? "Show Attachments" : "Hide Attachments",
            icon: isHidden ? ImageVisible : ImageInvisible,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: () => toggleHide(msg.id)
        };
    },

    flux: {
        async LOAD_MESSAGES_SUCCESS(payload: ILoadMessagesSuccessPayload) {
            for (const message of payload.messages) {
                await checkAndHide(message, settings.store);
            }
        },

        async MESSAGE_CREATE({ message }: IMessageCreatePayload) {
            await checkAndHide(message, settings.store);
        },

        async MESSAGE_UPDATE({ message }: IMessageUpdatePayload) {
            await checkAndHide(message, settings.store);
        }
    },

    async start() {
        style = document.createElement("style");
        style.id = "VencordHideAttachments";
        document.head.appendChild(style);

        await getHiddenMessages();
        await buildCss();
    },

    stop() {
        style.remove();
        hiddenMessages.clear();
    }
});
