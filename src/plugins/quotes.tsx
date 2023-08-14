/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";

function QuoteIcon() {
    return (

        <svg
            fill="var(--header-secondary)"
            width={24} height={24}
            viewBox={"-5 -8 42 42"}
        >
            <path d="m31.2 0h-7.2l-4.8 9.6v14.4h14.4v-14.4h-7.2zm-19.2 0h-7.2l-4.8 9.6v14.4h14.4v-14.4h-7.2z" />
        </svg>
    );
}

export default definePlugin({
    name: "Quote",
    description: "This plugin brings back old Discord quote option.",
    authors: [Devs.udiagod],
    dependencies: ["MessagePopoverAPI"],

    async start() {
        addButton("Quote", message => {
            return message?.content?.length
                ? {
                    label: "Quote",
                    icon: QuoteIcon,
                    message: message,
                    channel: ChannelStore.getChannel(message.channel_id),
                    onClick: async () => {
                        insertTextIntoChatInputBox(`\n> ${message?.content}\n<@${message?.author.id}> `);
                    }
                }
                : null;
        });

    },

    stop() {
        removeButton("Quote");
    },
});
