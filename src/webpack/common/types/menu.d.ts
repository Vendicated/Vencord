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

import type { ComponentType, CSSProperties, MouseEvent, PropsWithChildren, UIEvent } from "react";

type RC<C> = ComponentType<PropsWithChildren<C & Record<string, any>>>;

export interface Menu {
    Menu: RC<{
        navId: string;
        onClose(): void;
        className?: string;
        style?: CSSProperties;
        hideScroller?: boolean;
        onSelect?(): void;
    }>;
    MenuSeparator: ComponentType;
    MenuGroup: RC<{
        label?: string;
    }>;
    MenuItem: RC<{
        id: string;
        label: string;
        action?(e: MouseEvent): void;

        render?: ComponentType;
        onChildrenScroll?: Function;
        childRowHeight?: number;
        listClassName?: string;
    }>;
    MenuCheckboxItem: RC<{
        id: string;
        label: string;
        checked: boolean;
        action?(e: MouseEvent): void;
        disabled?: boolean;
    }>;
    MenuRadioItem: RC<{
        id: string;
        group: string;
        label: string;
        checked: boolean;
        action?(e: MouseEvent): void;
        disabled?: boolean;
    }>;
    MenuControlItem: RC<{
        id: string;
        interactive?: boolean;
    }>;
    // TODO: Type me
    MenuSliderControl: RC<any>;
}

export interface ContextMenuApi {
    close(): void;
    open(
        event: UIEvent,
        render?: Menu["Menu"],
        options?: { enableSpellCheck?: boolean; },
        renderLazy?: () => Promise<Menu["Menu"]>
    ): void;
    openLazy(
        event: UIEvent,
        renderLazy?: () => Promise<Menu["Menu"]>,
        options?: { enableSpellCheck?: boolean; }
    ): void;
}

