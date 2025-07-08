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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { MessageSnapshot } from "@vencord/discord-types";
import { Constants, Menu, PermissionsBits, PermissionStore, RestAPI, UserStore } from "@webpack/common";


const EMBED_SUPPRESSED = 1 << 2;

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { channel, message: { author, messageSnapshots, embeds, flags, id: messageId } }) => {
    const isEmbedSuppressed = (flags & EMBED_SUPPRESSED) !== 0;
    const hasEmbedsInSnapshots = messageSnapshots.some(
        (snapshot: MessageSnapshot) => snapshot?.message.embeds.length
    );

    if (!isEmbedSuppressed && !embeds.length && !hasEmbedsInSnapshots) return;

    const hasEmbedPerms = channel.isPrivate() || !!(PermissionStore.getChannelPermissions({ id: channel.id }) & PermissionsBits.EMBED_LINKS);
    if (author.id === UserStore.getCurrentUser().id && !hasEmbedPerms) return;

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
                    body: { flags: isEmbedSuppressed ? flags & ~EMBED_SUPPRESSED : flags | EMBED_SUPPRESSED }
                })
            }
        />
    ));
};

export default definePlugin({
    name: "UnsuppressEmbeds",
    authors: [Devs.rad, Devs.HypedDomi],
    description: "Allows you to unsuppress embeds in messages",
    contextMenus: {
        "message": messageContextMenuPatch
    }
});
