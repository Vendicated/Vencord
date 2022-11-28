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
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import definePlugin from "@utils/types";
import { ChannelStore, FluxDispatcher } from "@webpack/common";
import { Message } from "discord-types/general";

let style: HTMLStyleElement;

const KEY = "HideAttachments_HiddenIds";

const ImageVisible = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21Zm0-2h14V5H5v14Zm1-2h12l-3.75-5-3 4L9 13Zm-1 2V5v14Z" />
    </svg>
);
const ImageInvisible = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m21 18.15-2-2V5H7.85l-2-2H19q.825 0 1.413.587Q21 4.175 21 5Zm-1.2 4.45L18.2 21H5q-.825 0-1.413-.587Q3 19.825 3 19V5.8L1.4 4.2l1.4-1.4 18.4 18.4ZM6 17l3-4 2.25 3 .825-1.1L5 7.825V19h11.175l-2-2Zm7.425-6.425ZM10.6 13.4Z" />
    </svg>
);

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
    patches: [{
        find: "Messages.MESSAGE_UTILITIES_A11Y_LABEL",
        replacement: {
            match: /(message:(.).{0,100}Fragment,\{children:\[)(.{0,40}renderPopout:.{0,200}message_reaction_emoji_picker.+?return (.{1,3})\(.{0,30}"add-reaction")/,
            replace: "$1Vencord.Plugins.plugins.HideAttachments.renderButton($2, $4),$3"
        }
    }],

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
        :is(${elements}) [class*="embedWrapper"] {
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

    renderButton(msg: Message, makeItem: (data: any) => React.ComponentType) {
        try {
            if (!msg.attachments.length && !msg.embeds.length) return null;

            const isHidden = hiddenMessages.has(msg.id);

            return makeItem({
                key: "HideAttachments",
                label: isHidden ? "Show Attachments" : "Hide Attachments",
                icon: isHidden ? ImageVisible : ImageInvisible,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => this.toggleHide(msg.id)
            });
        } catch (err) {
            new Logger("HideAttachments").error(err);
            return null;
        }
    },

    async toggleHide(id: string) {
        const ids = await getHiddenMessages();
        if (!ids.delete(id))
            ids.add(id);

        await saveHiddenMessages(ids);
        await this.buildCss();

        // update is necessary to rerender the PopOver
        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: { id }
        });
    }
});
