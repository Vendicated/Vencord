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
import { filters, mapMangledModuleLazy, waitFor } from "../webpack";
import type * as t from "./types/menu";

export let Menu = {} as t.Menu;

waitFor("MenuItem", m => Menu = m);

export const ContextMenu: t.ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN"', {
    open: filters.byCode("stopPropagation"),
    openLazy: m => m.toString().length < 50,
    close: filters.byCode("CONTEXT_MENU_CLOSE")
});

