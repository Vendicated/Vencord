/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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

