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

import { addButton, removeButton } from "@api/MessagePopover";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Forms, Parser, Text, showToast } from "@webpack/common";
import { Message } from "discord-types/general";

const DownloadIcon = () => {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
        <path d="M17 12v5H3v-5H1v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" />
        <path d="M10 15l5-6h-4V1H9v8H5l5 6z" />
    </svg>;
};

function sortObject<T extends object>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).sort(([k1], [k2]) => k1.localeCompare(k2))) as T;
}

function cleanMessage(msg: Message) {
    const clone = sortObject(JSON.parse(JSON.stringify(msg)));
    for (const key of [
        "email",
        "phone",
        "mfaEnabled",
        "personalConnectionId"
    ]) delete clone.author[key];

    const cloneAny = clone as any;
    delete cloneAny.editHistory;
    delete cloneAny.deleted;
    cloneAny.attachments?.forEach(a => delete a.deleted);

    return clone;
}

function downloadVoiceMessage(msg: Message) {
    msg = cleanMessage(msg);

    if (msg.attachments.length === 0 || msg.attachments[0].content_type !== "audio/ogg") {
        showToast("Message is not a voice message!", 2);
    } else {
        const voiceMessage = msg.attachments[0].url;
        open(voiceMessage);
        showToast("Successfully downloaded!", 1);
    }
}

export default definePlugin({
    name: "DownloadVoiceMessage",
    description: "Downloads a voice message.",
    authors: [
        {
            id: 402518467556671500n,
            name: "Steveruu",
        },
    ],
    patches: [],
    dependencies: ["MessagePopoverAPI"],

    start() {
        addButton("DownloadVoice", msg => {
            const mouseClicked = () => {
                downloadVoiceMessage(msg);
            };

            const label = "Download voice message";

            return {
                label,
                icon: DownloadIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: mouseClicked
            };
        });
    },

    stop() {
        removeButton("DownloadVoice");
    }
});
