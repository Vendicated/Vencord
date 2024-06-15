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

import { findGroupChildrenByChildId, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { MessageFlags } from "@vencord/discord-types";
import { Constants, Menu, Permissions, PermissionStore, RestAPI, UserStore } from "@webpack/common";

const messageContextMenuPatch = ((children, { channel, message }) => {
    const { author, embeds, flags, id: messageId } = message;

    const isEmbedSuppressed = message.hasFlag(MessageFlags.SUPPRESS_EMBEDS);
    if (!isEmbedSuppressed && !embeds.length) return;

    const hasEmbedPerms = channel.isPrivate() || PermissionStore.can(Permissions.EMBED_LINKS, channel);
    if (author.id === UserStore.getCurrentUser()!.id && !hasEmbedPerms) return;

    const menuGroup = findGroupChildrenByChildId("delete", children);
    const deleteIndex = menuGroup?.findIndex(i => i?.props?.id === "delete");
    if (!deleteIndex || !menuGroup) return;

    menuGroup.splice(deleteIndex - 1, 0, (
        <Menu.MenuItem
            id="unsuppress-embeds"
            key="unsuppress-embeds"
            label={isEmbedSuppressed ? "Unsuppress Embeds" : "Suppress Embeds"}
            color={isEmbedSuppressed ? undefined : "danger"}
            icon={isEmbedSuppressed ? ImageVisible : ImageInvisible}
            action={() =>
                RestAPI.patch({
                    url: Constants.Endpoints.MESSAGE(channel.id, messageId),
                    body: { flags: isEmbedSuppressed ? flags & ~MessageFlags.SUPPRESS_EMBEDS : flags | MessageFlags.SUPPRESS_EMBEDS }
                })
            }
        />
    ));
}) satisfies NavContextMenuPatchCallback;

export default definePlugin({
    name: "UnsuppressEmbeds",
    authors: [Devs.rad, Devs.HypedDomi],
    description: "Allows you to unsuppress embeds in messages",
    contextMenus: {
        "message": messageContextMenuPatch
    }
});
