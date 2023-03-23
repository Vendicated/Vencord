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

import { addContextMenuPatch, findGroupChildrenByChildId, removeContextMenuPatch } from "@api/ContextMenu";
import { LazyComponent } from "@utils/misc";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { find, findByCode } from "@webpack";
import { Menu, React } from "@webpack/common";

const ImageModal = LazyComponent(() => findByCode(".MEDIA_MODAL_CLOSE,"));
const MaskedLink = LazyComponent(() => find(m => m.type?.toString().includes("MASKED_LINK)")));

function getAvatar(user, inGuild) {
    const avatarBaseUrl = "https://cdn.discordapp.com/avatars";
    const guildAvatarBaseUrl = "https://cdn.discordapp.com/guilds";
    if (inGuild) {
        var guildSpecificAvatar = Object.values(user.guildMemberAvatars)[0];
        var guildId = Object.keys(user.guildMemberAvatars)[0];
        return `${guildAvatarBaseUrl}/${guildId}/users/${user.id}/avatars/${guildSpecificAvatar}.${(guildSpecificAvatar.startsWith("a_") ? "gif" : "png")}`;
    }
    return `${avatarBaseUrl}/${user.id}/${user.avatar}.${(user.avatar.startsWith("a_") ? "gif" : "png")}`;
}

function getStickerLink(stickerId: String, size: Number) {
    return `https://media.discordapp.net/stickers/${stickerId}.png?size=${size}`;
}

function openImage(url: string) {
    const u = new URL(url);
    u.searchParams.set("size", "512");
    url = u.toString();

    openModal(modalProps => (
        <ModalRoot size={ModalSize.DYNAMIC} {...modalProps}>
            <ImageModal
                shouldAnimate={true}
                original={url}
                src={url}
                renderLinkComponent={MaskedLink}
            />
        </ModalRoot>
    ));
}

function buildContextMenu_user(inGuild = false, user) {
    var ContextMenuItem_user = (
        <Menu.MenuItem
            id="view-avatar"
            key="view-avatar"
            label="View Avatar"
            action={() => { openImage(getAvatar(user, false)); }}
        >
        </Menu.MenuItem >
    );
    if (inGuild) {
        ContextMenuItem_user = (
            <Menu.MenuItem
                id="view-avatar"
                key="view-avatar"
                label="View"
            >
                <Menu.MenuItem
                    id="vav-show-avatar"
                    key="vav-show-avatar"
                    label="Avatar"
                    action={() => {
                        openImage(getAvatar(user, false));
                    }
                    }
                >
                </Menu.MenuItem>
                <Menu.MenuItem
                    id="vav-show-nitroavatar"
                    key="vav-show-nitroavatar"
                    label="Server-Specific Avatar"
                    action={() => {
                        openImage(getAvatar(user, true));
                    }
                    }
                >
                </Menu.MenuItem>
            </Menu.MenuItem >
        );
    }
    return ContextMenuItem_user;
}

function buildContextMenu_sticker(message) {
    var ContextMenuItem_sticker = (
        <Menu.MenuItem
            id="view-sticker"
            key="view-sticker"
            label="View Sticker"
            action={() => {
                openImage(getStickerLink(message.stickerItems[0].id, 512));
            }}
        >
        </Menu.MenuItem >
    );
    return ContextMenuItem_sticker;
}

function userContextMenuPatch(children, props) {
    if (!props) return;
    const group = findGroupChildrenByChildId("user-profile", children);
    const inGuild = Object.values(props.user.guildMemberAvatars).length > 0;
    if (group && !group.some(child => child?.props?.id === "view-avatar")) {
        group.push(buildContextMenu_user(inGuild, props.user));
    }
}

function messageContextMenuPatch(children, props) {
    if (!props) return;
    const group = findGroupChildrenByChildId("copy-link", children);
    const includesStickers = props.message.stickerItems.length > 0;
    if (group && !group.some(child => child?.props?.id === "view-sticker") && includesStickers) {
        group.push(buildContextMenu_sticker(props.message));
    }
}

export default definePlugin({
    name: "Viewy",
    description: "Allows you to view user avatars, server-specific user avatars and stickers.",
    authors: [
        {
            id: 225281513858662400n,
            name: "Bonkeyzz",
        },
    ],
    start() {
        addContextMenuPatch("user-context", userContextMenuPatch);
        addContextMenuPatch("message", messageContextMenuPatch);
    },
    stop() {
        removeContextMenuPatch("user-context", userContextMenuPatch);
        removeContextMenuPatch("message", messageContextMenuPatch);
    },
});
