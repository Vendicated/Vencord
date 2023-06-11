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

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, PermissionsBits, PermissionStore, RestAPI, UserStore } from "@webpack/common";

const EMBED_SUPPRESSED = 1 << 2;

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const { message: { author, embeds, flags } } = props;

    const isEmbedSuppressed = (flags & EMBED_SUPPRESSED) !== 0;
    const canManageMessages = !!(PermissionStore.getChannelPermissions({ id: props.channel.id }) & PermissionsBits.MANAGE_MESSAGES);
    const isOwnDM = author.id === UserStore.getCurrentUser().id && (props.channel.isDM() || props.channel.isGroupDM());
    if (!canManageMessages && !isOwnDM) return;

    return () => {
        if (!isEmbedSuppressed && !embeds.length) return;
        const menuGroup = findGroupChildrenByChildId("delete", children) || children;
        const deleteItem = menuGroup.findIndex(i => i?.props?.id === "delete") || menuGroup.length - 1;
        menuGroup.splice(deleteItem - 1, 0, (
            <Menu.MenuItem
                id="unsuppress-embeds"
                key="unsuppress-embeds"
                label={isEmbedSuppressed ? "Unsuppress Embeds" : "Suppress Embeds"}
                color={isEmbedSuppressed ? undefined : "danger"}
                action={() => {
                    RestAPI.patch({
                        url: `/channels/${props.channel.id}/messages/${props.message.id}`,
                        body: { flags: isEmbedSuppressed ? flags & ~EMBED_SUPPRESSED : flags | EMBED_SUPPRESSED }
                    });
                }}
            />
        ));
    };
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
