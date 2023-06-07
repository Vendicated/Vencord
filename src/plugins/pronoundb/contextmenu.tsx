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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { FluxDispatcher, Menu } from "@webpack/common";
import { User } from "discord-types/general";

import { getLocalPronounOverrideNow, setLocalPronounOverride } from "./pronoundbUtils";
import { PronounCode, PronounCodes, PronounMapping } from "./types";

export const PronounOverrideContextMenu: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => () => {
    const userId = user.id;
    // We cannot useAwaiter here for some reason (probably because this is not a React component, and we sadly can also not return a custom component and use useAwaiter in there, since we are in a context menu), so we have to use the cached version, which should be fine since whenever we right click someone we probably have loaded their profile.
    const selected = getLocalPronounOverrideNow(userId);
    const action = (newOverride: PronounCode | null) => () => {
        setLocalPronounOverride(userId, newOverride);
        FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
    };
    console.log(selected);
    children.push(<Menu.MenuGroup>
        <Menu.MenuItem
            id="pronoundb-override"
            label="Set Pronouns"
        >
            {<Menu.MenuGroup>
                {
                    ...PronounCodes.map(id =>
                        <Menu.MenuRadioItem
                            checked={selected === id}
                            action={action(id)}
                            id={id}
                            label={PronounMapping[id]}
                            group="pronoundb-override-group">
                        </Menu.MenuRadioItem>)
                }
                <Menu.MenuSeparator />
                <Menu.MenuRadioItem
                    checked={selected === null}
                    id={"null"}
                    action={action(null)}
                    label={"No override"}
                    group="pronoundb-override-group">
                </Menu.MenuRadioItem>
            </Menu.MenuGroup>}
        </Menu.MenuItem>
    </Menu.MenuGroup>);
};
