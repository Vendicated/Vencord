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

import { classes } from "@utils/misc";
import { classNameFactory } from "@api/Styles";
import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { settings } from "../settings";
import { Menu } from "@webpack/common";
import type { Channel, User } from "discord-types/general";

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

function BlockIcon({ height = 24, width = 24, className }: { height?: number; width?: number; className?: string; }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            height={height}
            width={width}
            className={classes(classNameFactory("vc-trans-")("icon"), className)}
        >
            <path fill="currentColor" d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192 41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192-41.5 0-79.9 13.1-111.2 35.5l267.7 267.7zM0 256a256 256 0 11512 0 256 256 0 11-512 0z"></path>
        </svg>
    );
}

export const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => () => {
    if (settings.store.ignoreUsers.includes(user.id)) {
        children.push(
            <Menu.MenuItem
                id="vc-block-pronouns"
                label="Unblock User Pronouns"
                action={() => {
                    let newUsers = settings.store.ignoreUsers.split(",")
                        .filter((id) => id !== user.id);
                    settings.store.ignoreUsers = newUsers.join(",");
                }}
                icon={BlockIcon}
            />
        );
        return;
    }
    children.push(
        <Menu.MenuItem
            id="vc-block-pronouns"
            label="Block User Pronouns"
            action={() => {
                let newUsers = settings.store.ignoreUsers.split(",");
                newUsers.push(user.id);
                settings.store.ignoreUsers = newUsers.join(",");
            }}
            icon={BlockIcon}
        />
    );
};
