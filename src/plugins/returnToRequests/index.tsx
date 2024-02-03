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

import { Menu, RestAPI } from "@webpack/common";
import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { NavContextMenuPatchCallback, addContextMenuPatch, findGroupChildrenByChildId, removeContextMenuPatch } from "@api/ContextMenu";

async function returnDMtoRequests(id: string) {
    await RestAPI.delete({
        url: `/channels/${id}/recipients/@me`,
    });
}

function rtrMenuItem(channelId: string) {
    return (
        <>
            <Menu.MenuItem
                id="car-dm"
                label="Move to Message Requests"
                action={() => returnDMtoRequests(channelId)}
            />
        </>
    );
}

const UserContext: NavContextMenuPatchCallback = (children, props) => () => {
    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        container.splice(idx, 0, rtrMenuItem(props.channel.id));
    }
};

export function addContextMenus() {
    addContextMenuPatch("user-context", UserContext);
}

export function removeContextMenus() {
    removeContextMenuPatch("user-context", UserContext);
}

export default definePlugin({
    name: "ReturnToRequests",
    description: "Right-click any DM and select 'Move to Message Requests' to return DMs to the Message Requests queue. This works similarly to ignoring incoming message requests, where any new messages from the sender will appear in Message Requests.",
    authors: [Devs.SUDO],

    start: addContextMenus,
    stop: removeContextMenus
});
