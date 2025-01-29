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

// eslint-disable-next-line path-alias/no-relative
import { filters, mapMangledModuleLazy, waitFor, wreq } from "../webpack";
import type * as t from "./types/menu";

export const Menu = {} as t.Menu;

// Relies on .name properties added by the MenuItemDemanglerAPI
waitFor(m => m.name === "MenuCheckboxItem", (_, id) => {
    // we have to do this manual require by ID because m is in this case the MenuCheckBoxItem instead of the entire module
    const module = wreq(id as any);

    for (const e of Object.values(module)) {
        if (typeof e === "function" && e.name.startsWith("Menu")) {
            Menu[e.name] = e;
        }
    }
});

waitFor(filters.componentByCode('path:["empty"]'), m => Menu.Menu = m);
waitFor(filters.componentByCode("sliderContainer", "slider", "handleSize:16", "=100"), m => Menu.MenuSliderControl = m);
waitFor(filters.componentByCode('role:"searchbox', "top:2", "query:"), m => Menu.MenuSearchControl = m);

export const ContextMenuApi: t.ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN', {
    closeContextMenu: filters.byCode("CONTEXT_MENU_CLOSE"),
    openContextMenu: filters.byCode("renderLazy:"),
    openContextMenuLazy: e => typeof e === "function" && e.toString().length < 100
});
