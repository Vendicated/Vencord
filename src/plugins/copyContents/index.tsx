/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addButton, removeButton } from "@api/MessagePopover";
import { copyWithToast } from "@utils/misc";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";

const Clipboard = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M17 4h-1.18A3 3 0 0 0 13 2h-2a3 3 0 0 0-2.82 2H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3m-7 1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h-4Zm8 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h1v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6h1a1 1 0 0 1 1 1Z"
            />
        </svg>
    );
};

export default definePlugin({
    name: "CopyContents",
    description:
        "Replicates the mobile client feature to copy message contents, including formatting.",
    authors: [
        {
            id: 785248634458996767n,
            name: "br4x.",
        },
    ],
    dependencies: ["MessagePopoverAPI"],

    start() {
        addButton("CopyContents", msg => {
            const copyMessageContents = () => {
                copyWithToast(msg.content);
            };

            return {
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: copyMessageContents,
                label: "Copy Contents",
                icon: Clipboard,
            };
        });
    },

    stop() {
        removeButton("CopyContents");
    },
});
