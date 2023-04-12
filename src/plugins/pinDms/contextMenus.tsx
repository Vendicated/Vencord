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

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Menu } from "@webpack/common";

import { isPinned, togglePin } from "./settings";

const seen = new WeakSet();

function PinMenuItem(channelId: string) {
    return (
        <Menu.MenuItem
            id="pin-dm"
            label={isPinned(channelId) ? "Unpin DM" : "Pin DM"}
            action={() => togglePin(channelId)}
        />
    );
}

const GroupDMContext: NavContextMenuPatchCallback = (children, props) => {
    if (seen.has(children)) return;
    seen.add(children);

    const container = findGroupChildrenByChildId("leave-channel", children);
    if (container)
        container.unshift(PinMenuItem(props.channel.id));
};

const UserContext: NavContextMenuPatchCallback = (children, props) => {
    if (seen.has(children)) return;
    seen.add(children);

    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        container.splice(idx, 0, PinMenuItem(props.channel.id));
    }
};

export function addContextMenus() {
    addContextMenuPatch("gdm-context", GroupDMContext);
    addContextMenuPatch("user-context", UserContext);
}

export function removeContextMenus() {
    removeContextMenuPatch("gdm-context", GroupDMContext);
    removeContextMenuPatch("user-context", UserContext);
}
