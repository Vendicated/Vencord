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

import { proxyLazy } from "@utils/proxyLazy";

// eslint-disable-next-line path-alias/no-relative
import { filters, mapMangledModule, mapMangledModuleLazy } from "../webpack";


export const Menu = proxyLazy(() => {
    const hasDeobfuscator = Vencord.Settings.plugins.MenuItemDeobfuscatorAPI.enabled;
    const menuItems = ["MenuSeparator", "MenuGroup", "MenuItem", "MenuCheckboxItem", "MenuRadioItem", "MenuControlItem"];

    const map = mapMangledModule("♫ ⊂(｡◕‿‿◕｡⊂) ♪", {
        ContextMenu: filters.byCode("getContainerProps"),
        ...Object.fromEntries((hasDeobfuscator ? menuItems : []).map(s => [s, (m: any) => m.name === s]))
    }) as Menu;

    if (!hasDeobfuscator) {
        for (const m of menuItems)
            Object.defineProperty(map, m, {
                get() {
                    throw new Error("MenuItemDeobfuscator must be enabled to use this.");
                }
            });
    }

    return map;
});

export const ContextMenu = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN"', {
    open: filters.byCode("stopPropagation"),
    openLazy: m => m.toString().length < 50,
    close: filters.byCode("CONTEXT_MENU_CLOSE")
}) as {
    close(): void;
    open(
        event: React.UIEvent,
        render?: Menu["ContextMenu"],
        options?: { enableSpellCheck?: boolean; },
        renderLazy?: () => Promise<Menu["ContextMenu"]>
    ): void;
    openLazy(
        event: React.UIEvent,
        renderLazy?: () => Promise<Menu["ContextMenu"]>,
        options?: { enableSpellCheck?: boolean; }
    ): void;
};

export const MaskedLinkStore = mapMangledModuleLazy('"MaskedLinkStore"', {
    openUntrustedLink: filters.byCode(".apply(this,arguments)")
});

type RC<C> = React.ComponentType<React.PropsWithChildren<C & Record<string, any>>>;

interface Menu {
    ContextMenu: RC<{
        navId: string;
        onClose(): void;
        className?: string;
        style?: React.CSSProperties;
        hideScroller?: boolean;
        onSelect?(): void;
    }>;
    MenuSeparator: React.ComponentType;
    MenuGroup: RC<any>;
    MenuItem: RC<{
        id: string;
        label: string;
        render?: React.ComponentType;
        onChildrenScroll?: Function;
        childRowHeight?: number;
        listClassName?: string;
    }>;
    MenuCheckboxItem: RC<{
        id: string;
    }>;
    MenuRadioItem: RC<{
        id: string;
    }>;
    MenuControlItem: RC<{
        id: string;
        interactive?: boolean;
    }>;
}
