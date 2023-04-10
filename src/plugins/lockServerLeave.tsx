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

import { addContextMenuPatch, findGroupChildrenByChildId,NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";

let locks: string[] | null;
const DATA_KEY = "LockServerLeave_SERVERS";

function guildMenuPatch(popout: boolean): NavContextMenuPatchCallback {
    return (children, props) => {
        if (locks === null)
            return;

        const target = popout ? "leave" : "leave-guild";
        const group = findGroupChildrenByChildId(target, children);

        if (group && !group.some(child => child?.props?.id === "lock")) {
            const { id } = props.guild;
            const start = popout ? 1 : 0;

            if (locks.includes(id))
                group.splice(start, 1);

            group.splice(start, 0,
                <Menu.MenuItem
                    id="lock"
                    key="lock"
                    label={locks.includes(id) ? "Unlock Leave Server" : "Lock Leave Server"}
                    action={
                        () => {
                            if (locks === null)
                                return;

                            if (locks.includes(id))
                                locks.splice(locks.indexOf(id), 1);
                            else
                                locks.push(id);

                            DataStore.set(DATA_KEY, locks);
                        }
                    }>
                </Menu.MenuItem>
            );
        }
    };
}

const guildContextMenuPatch = guildMenuPatch(false);
const guildPopoutPatch = guildMenuPatch(true);

export default definePlugin({
    name: "LockServerLeave",
    description: "Hide button to leave on chosen servers.",
    authors: [Devs.TheKodeToad],
    dependencies: ["ContextMenuAPI"],

    async start() {
        locks = await DataStore.get(DATA_KEY) ?? [];
        addContextMenuPatch("guild-context", guildContextMenuPatch);
        addContextMenuPatch("guild-header-popout", guildPopoutPatch);
    },
    stop() {
        locks = null;
        removeContextMenuPatch("guild-context", guildContextMenuPatch);
        removeContextMenuPatch("guild-header-popout", guildPopoutPatch);
    }
});
