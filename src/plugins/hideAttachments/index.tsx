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

import "./styles.css";

import { get, set } from "@api/DataStore";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore } from "@webpack/common";
import { MessageSnapshot } from "@webpack/types";
import { Embed } from "discord-types/general";

import { ILoadMessagesSuccessPayload, IMessage, IMessageCreatePayload, IMessageUpdatePayload } from "./types";
import { isStringEmpty } from "./utils";

const KEY = "HideAttachments_HiddenIds";

let hiddenMessages = new Set<string>();

async function getHiddenMessages() {
    hiddenMessages = await get(KEY) ?? new Set();
    return hiddenMessages;
}

const saveHiddenMessages = (ids: Set<string>) => set(KEY, ids);

migratePluginSettings("HideMedia", "HideAttachments");

/**
 * Toggle attachment/embed hiding
 */
const toggleHide = async (channelId: string, messageId: string): Promise<void> => {
    const ids = await getHiddenMessages();
    if (!ids.delete(messageId))
        ids.add(messageId);

    await saveHiddenMessages(ids);
    updateMessage(channelId, messageId);
};

/**
 * Determine if the message should be blocked according to user ID filter
 * @param {Message} payload The message to be checked
 * @param {string[]} userFilters List of user IDs to be checked
 * @returns {boolean}
 */
const shouldHideByUserIdFilter = (payload: IMessage, userFilters: string[]): boolean => {
    if (!payload.attachments.length && !payload.embeds.length) {
        return false;
    }

    for (const id of userFilters) {
        if (payload.author.id === id) {
            return true;
        }
    }

    return false;
};

/**
 * Checks if the embed should be hidden
 * @param {Embed[]} embeds List of embeds
 * @param {string[]} domainList List of domains
 */
const shouldHideEmbed = (embeds: Embed[], domainList: string[]): boolean => {
    for (const embed of embeds) {
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
 * Determine if the message should be blocked according to domain list filter
 * @param {Message} payload The message to be checked
 * @param {string[]} domainList List of domains to be checked
 * @returns {boolean}
 */
const shouldHideByDomainListFilter = (payload: IMessage, domainList: string[]): boolean => {
    if (payload.embeds.length <= 0) {
        return false;
    }

    if (shouldHideEmbed(payload.embeds, domainList)) {
        return true;
    }

    // Check embeds from the forwarded messages
    const hasReference = payload.message_reference && Array.isArray(payload.message_snapshots);
    if (!hasReference) {
        return false;
    }

    for (const snapshot of payload.message_snapshots!) {
        if (shouldHideEmbed(snapshot.message.embeds, domainList)) {
            return true;
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
        await toggleHide(message.channel_id, message.id);
        return;
    }

    const domainFilters = isStringEmpty(store.filterDomainList)
        ? []
        : store.filterDomainList.split(",");
    if (shouldHideByDomainListFilter(message, domainFilters)) {
        await toggleHide(message.channel_id, message.id);
        return;
    }

    // Forwarded messages
    const hasReference = message.message_reference && Array.isArray(message.message_snapshots);
    if (hasReference) {
        for (const snapshot of message.message_snapshots!) {
            if (shouldHideByDomainListFilter(snapshot.message, domainFilters)) {
                await toggleHide(message.channel_id, message.id);
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
    },
    filterUserList: {
        type: OptionType.STRING,
        description: "Comma separated list of User IDs to automatically hide their attachments/embeds. (Requires auto hide to be ON)",
        default: "",
    },
    filterDomainList: {
        type: OptionType.STRING,
        description: "Comma separated list of domains to automatically hide their embeds. (Requires auto hide to be ON)",
        default: "",
    }
});

export default definePlugin({
    name: "HideMedia",
    description: "Hide attachments and embeds for individual messages via hover button",
    authors: [Devs.Ven, Devs.aiko],
    dependencies: ["MessageUpdaterAPI"],

    patches: [{
        find: "this.renderAttachments(",
        replacement: {
            match: /(?<=\i=)this\.render(?:Attachments|Embeds|StickersAccessories)\((\i)\)/g,
            replace: "$self.shouldHide($1?.id)?null:$&"
        }
    }],

    settings,

    renderMessagePopoverButton(msg: IMessage) {
        // @ts-ignore - discord-types lags behind discord.
        const hasAttachmentsInSnapshots = msg.messageSnapshots.some(
            (snapshot: MessageSnapshot) => snapshot?.message.attachments.length || snapshot?.message.embeds.length
        );

        if (!msg.attachments.length && !msg.embeds.length && !msg.stickerItems.length && !hasAttachmentsInSnapshots) return null;

        const isHidden = hiddenMessages.has(msg.id);

        return {
            label: isHidden ? "Show Media" : "Hide Media",
            icon: isHidden ? ImageVisible : ImageInvisible,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: () => toggleHide(msg.channel_id, msg.id)
        };
    },

    renderMessageAccessory({ message }) {
        if (!this.shouldHide(message.id)) return null;

        return (
            <span className={classes("vc-hideAttachments-accessory", !message.content && "vc-hideAttachments-no-content")}>
                Media Hidden
            </span>
        );
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
        await getHiddenMessages();
    },

    stop() {
        hiddenMessages.clear();
    },

    shouldHide(messageId: string) {
        return hiddenMessages.has(messageId);
    }
});
