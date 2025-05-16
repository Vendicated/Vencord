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
import { migratePluginSettings } from "@api/Settings";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";
import { MessageSnapshot } from "@webpack/types";

const KEY = "HideAttachments_HiddenIds";

let hiddenMessages = new Set<string>();

async function getHiddenMessages() {
    hiddenMessages = await get(KEY) ?? new Set();
    return hiddenMessages;
}

const saveHiddenMessages = (ids: Set<string>) => set(KEY, ids);

migratePluginSettings("HideMedia", "HideAttachments");

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

    renderMessagePopoverButton(msg) {
        // @ts-ignore - discord-types lags behind discord.
        const hasAttachmentsInShapshots = msg.messageSnapshots.some(
            (snapshot: MessageSnapshot) => snapshot?.message.attachments.length
        );

        if (!msg.attachments.length && !msg.embeds.length && !msg.stickerItems.length && !hasAttachmentsInShapshots) return null;

        const isHidden = hiddenMessages.has(msg.id);

        return {
            label: isHidden ? "Show Media" : "Hide Media",
            icon: isHidden ? ImageVisible : ImageInvisible,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: () => this.toggleHide(msg.channel_id, msg.id)
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

    async start() {
        await getHiddenMessages();
    },

    stop() {
        hiddenMessages.clear();
    },

    shouldHide(messageId: string) {
        return hiddenMessages.has(messageId);
    },

    async toggleHide(channelId: string, messageId: string) {
        const ids = await getHiddenMessages();
        if (!ids.delete(messageId))
            ids.add(messageId);

        await saveHiddenMessages(ids);
        updateMessage(channelId, messageId);
    }
});
