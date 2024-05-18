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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addButton, removeButton } from "@api/MessagePopover";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { ChannelStore, Menu } from "@webpack/common";
import { Message } from "discord-types/general";

function RepeatMessageIcon({ className }: { className?: string; }) {
    return (
        <svg
            viewBox="0 -960 960 960"
            height={24}
            width={24}
            className={classes(classNameFactory("vc-repeat-")("icon"), className)}
        >
            <path fill="currentColor" d="m274-200 34 34q12 12 11.5 28T308-110q-12 12-28.5 12.5T251-109L148-212q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l103-103q12-12 28.5-11.5T308-370q11 12 11.5 28T308-314l-34 34h406v-120q0-17 11.5-28.5T720-440q17 0 28.5 11.5T760-400v120q0 33-23.5 56.5T680-200H274Zm412-480H280v120q0 17-11.5 28.5T240-520q-17 0-28.5-11.5T200-560v-120q0-33 23.5-56.5T280-760h406l-34-34q-12-12-11.5-28t11.5-28q12-12 28.5-12.5T709-851l103 103q6 6 8.5 13t2.5 15q0 8-2.5 15t-8.5 13L709-589q-12 12-28.5 11.5T652-590q-11-12-11.5-28t11.5-28l34-34Z" />
        </svg>
    );
}

let shift = false;

function repeatMessage(channelId: string, id: string, content: string, stickers: any[]) {
    sendMessage(channelId, {
        content
    }, true, {
        allowedMentions: {
            parse: [],
            replied_user: false
        },
        messageReference: shift ? {
            channel_id: channelId,
            message_id: id
        } : undefined,
        stickerIds: stickers.map(s => s.id)
    });
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message.content && message.stickerItems.length === 0) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "reply") + 1, 0, (
        <Menu.MenuItem
            id="vc-repeat"
            label="Repeat"
            icon={RepeatMessageIcon}
            action={async () => repeatMessage(message.channel_id, message.id, message.content, message.stickerItems)}
        />
    ));
};

function setTitle(title: string) {
    const contextMenuOption = document.querySelector("#message-vc-repeat .label__563c3");

    if (contextMenuOption) contextMenuOption.innerHTML = title;
}

const keyupListener = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
        shift = false;

        setTitle("Repeat");
    }
};

const keydownListener = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
        shift = true;

        setTitle("Repeat and Reply");
    }
};

export default definePlugin({
    name: "Repeat Message",
    description: "Allows you to repeat messages quickly. If you hold shift while clicking the Repeat option, it will reply to the message.",
    authors: [{
        name: "✨Tolgchu✨",
        id: 329671025312923648n
    }],
    contextMenus: {
        "message": messageCtxPatch
    },
    start() {
        addButton("vc-repeat", message => {
            if (!message.content && message.stickerItems.length === 0) return null;

            return {
                label: "Repeat (Click) / Repeat and Reply (Shift + Click)",
                icon: RepeatMessageIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => repeatMessage(message.channel_id, message.id, message.content, message.stickerItems)
            };
        });

        document.addEventListener("keyup", keyupListener);
        document.addEventListener("keydown", keydownListener);
    },
    stop() {
        removeButton("vc-repeat");

        document.removeEventListener("keyup", keyupListener);
        document.removeEventListener("keydown", keydownListener);
    },
});
