/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type * as t from "@vencord/discord-types";
import { filters, mapMangledModuleLazy, waitFor, wreq } from "@webpack";

export const Menu = {} as t.Menu;

// Relies on .name properties added by the MenuItemDemanglerAPI
waitFor(m => m.name === "MenuCheckboxItem", (_, id) => {
    // We have to do this manual require by ID because m in this case is the MenuCheckBoxItem instead of the entire module
    const exports = wreq(id);

    for (const exportKey in exports) {
        // Some exports might have not been initialized yet due to circular imports, so try catch it.
        try {
            var exportValue = exports[exportKey];
        } catch {
            continue;
        }

        if (typeof exportValue === "function" && exportValue.name.startsWith("Menu")) {
            Menu[exportValue.name] = exportValue;
        }
    }
});

waitFor(filters.componentByCode('path:["empty"]'), m => Menu.Menu = m);
waitFor(filters.componentByCode("sliderContainer", "slider", "handleSize:16", "=100"), m => Menu.MenuSliderControl = m);
waitFor(filters.componentByCode(".SEARCH)", ".focus()", "query:"), m => Menu.MenuSearchControl = m);

export const ContextMenuApi: t.ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN', {
    closeContextMenu: filters.byCode("CONTEXT_MENU_CLOSE"),
    openContextMenu: filters.byCode("renderLazy:"),
    openContextMenuLazy: e => typeof e === "function" && e.toString().length < 100
});
