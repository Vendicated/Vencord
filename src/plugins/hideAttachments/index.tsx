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
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";
import { MessageSnapshot } from "@webpack/types";

let style: HTMLStyleElement;

const KEY = "HideAttachments_HiddenIds";

let hiddenMessages: Set<string> = new Set();
const getHiddenMessages = () => get(KEY).then(set => {
    hiddenMessages = set ?? new Set<string>();
    return hiddenMessages;
});
const saveHiddenMessages = (ids: Set<string>) => set(KEY, ids);

export default definePlugin({
    name: "HideAttachments",
    description: "Hide attachments and Embeds for individual messages via hover button",
    authors: [Devs.Ven],

    renderMessagePopoverButton(msg) {
        // @ts-ignore - discord-types lags behind discord.
        const hasAttachmentsInShapshots = msg.messageSnapshots.some(
            (snapshot: MessageSnapshot) => snapshot?.message.attachments.length
        );

        if (!msg.attachments.length && !msg.embeds.length && !msg.stickerItems.length && !hasAttachmentsInShapshots) return null;

        const isHidden = hiddenMessages.has(msg.id);

        return {
            label: isHidden ? "Show Attachments" : "Hide Attachments",
            icon: isHidden ? ImageVisible : ImageInvisible,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: () => this.toggleHide(msg.id)
        };
    },

    async start() {
        style = document.createElement("style");
        style.id = "VencordHideAttachments";
        document.head.appendChild(style);

        await getHiddenMessages();
        await this.buildCss();
    },

    stop() {
        style.remove();
        hiddenMessages.clear();
    },

    async buildCss() {
        const elements = [...hiddenMessages].map(id => `#message-accessories-${id}`).join(",");
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
    },

    async toggleHide(id: string) {
        const ids = await getHiddenMessages();
        if (!ids.delete(id))
            ids.add(id);

        await saveHiddenMessages(ids);
        await this.buildCss();
    }
});
