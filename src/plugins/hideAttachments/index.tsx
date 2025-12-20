/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { get, set } from "@api/DataStore";
import { updateMessage } from "@api/MessageUpdater";
import { migratePluginSettings } from "@api/Settings";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore } from "@webpack/common";

const KEY = "HideAttachments_HiddenIds";

let hiddenMessages = new Set<string>();

async function getHiddenMessages() {
    hiddenMessages = await get(KEY) ?? new Set();
    return hiddenMessages;
}

const saveHiddenMessages = (ids: Set<string>) => set(KEY, ids);

migratePluginSettings("HideMedia", "HideAttachments");

const hasMedia = (msg: Message) => msg.attachments.length > 0 || msg.embeds.length > 0 || msg.stickerItems.length > 0;

async function toggleHide(channelId: string, messageId: string) {
    const ids = await getHiddenMessages();
    if (!ids.delete(messageId))
        ids.add(messageId);

    await saveHiddenMessages(ids);
    updateMessage(channelId, messageId);
}

export default definePlugin({
    name: "HideMedia",
    description: "Hide attachments and embeds for individual messages via hover button",
    authors: [Devs.Ven],
    dependencies: ["MessageUpdaterAPI"],

    patches: [{
        find: "this.renderAttachments(",
        replacement: {
            match: /(?<=\i=)this\.render(?:Attachments|Embeds|StickersAccessories)\((\i)\)/g,
            replace: "$self.shouldHide($1?.id)?null:$&"
        }
    }],

    messagePopoverButton: {
        icon: ImageInvisible,
        render(msg) {
            if (!hasMedia(msg) && !msg.messageSnapshots.some(s => hasMedia(s.message))) return null;

            const isHidden = hiddenMessages.has(msg.id);

            return {
                label: isHidden ? "Show Media" : "Hide Media",
                icon: isHidden ? ImageVisible : ImageInvisible,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => toggleHide(msg.channel_id, msg.id)
            };
        },
    },

    renderMessageAccessory({ message }) {
        if (!this.shouldHide(message.id)) return null;

        return (
            <span className={classes("vc-hideAttachments-accessory", !message.content && "vc-hideAttachments-no-content")}>
                Media Hidden
            </span>
        );
    },

    async start() {
        await getHiddenMessages();
    },

    stop() {
        hiddenMessages.clear();
    },

    shouldHide(messageId: string) {
        return hiddenMessages.has(messageId);
    },
});
