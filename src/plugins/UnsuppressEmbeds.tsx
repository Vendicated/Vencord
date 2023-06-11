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

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, PermissionStore, RestAPI } from "@webpack/common";

const EMBED_SUPPRESSED = 1 << 2;
const MANAGE_MESSAGES = 1n << 13n;

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    const { message: { embeds, flags } } = props;

    const canManageMessages = !!(PermissionStore.getChannelPermissions({ id: props.channel.id }) & MANAGE_MESSAGES);
    const isEmbedSuppressed = !!(flags & EMBED_SUPPRESSED);

    if (!canManageMessages) return;

    const menuItem = (() => {
        if (isEmbedSuppressed) return (
            <Menu.MenuItem
                id="unsupress-embeds"
                key="unsupress-embeds"
                label={"Unsuppress Embeds"}
                action={() => {
                    RestAPI.patch({
                        url: `/channels/${props.channel.id}/messages/${props.message.id}`,
                        body: { flags: flags & ~EMBED_SUPPRESSED }
                    });
                }}
            />
        );
        else if (embeds.length) return (
            <Menu.MenuItem
                id="supress-embeds"
                key="supress-embeds"
                label={"Suppress Embeds"}
                action={() => {
                    RestAPI.patch({
                        url: `/channels/${props.channel.id}/messages/${props.message.id}`,
                        body: { flags: flags | EMBED_SUPPRESSED }
                    });
                }}
            />
        );
    })();

    if (!menuItem) return;
    children.push(menuItem);
};

export default definePlugin({
    name: "UnsuppressEmbeds",
    authors: [Devs.rad, Devs.HypedDomi],
    description: "Allows you to unsuppress embeds in messages",

    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
    },
});
