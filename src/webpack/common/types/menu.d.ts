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

import type { CSSProperties, MouseEvent, ReactNode, UIEvent } from "react";

export interface Menu {
    Menu: AnyComponentTypeWithChildren<{
        navId: string;
        onClose(): void;
        className?: string;
        style?: CSSProperties;
        hideScroller?: boolean;
        onSelect?(): void;
    }>;
    MenuSeparator: AnyComponentType;
    MenuGroup: AnyComponentTypeWithChildren<{
        label?: string;
    }>;
    MenuItem: AnyComponentTypeWithChildren<{
        id: string;
        label: ReactNode;
        action?(e: MouseEvent): void;
        icon?: AnyComponentType<any>;

        color?: string;
        render?: AnyComponentType<any>;
        onChildrenScroll?: Function;
        childRowHeight?: number;
        listClassName?: string;
        disabled?: boolean;
    }>;
    MenuCheckboxItem: AnyComponentTypeWithChildren<{
        id: string;
        label: string;
        checked: boolean;
        action?(e: MouseEvent): void;
        disabled?: boolean;
    }>;
    MenuRadioItem: AnyComponentTypeWithChildren<{
        id: string;
        group: string;
        label: string;
        checked: boolean;
        action?(e: MouseEvent): void;
        disabled?: boolean;
    }>;
    MenuControlItem: AnyComponentTypeWithChildren<{
        id: string;
        interactive?: boolean;
    }>;
    MenuSliderControl: AnyComponentTypeWithChildren<{
        minValue: number,
        maxValue: number,
        value: number,
        onChange(value: number): void,
        renderValue?(value: number): string,
    }>;
    MenuSearchControl: AnyComponentTypeWithChildren<{
        query: string;
        onChange(query: string): void;
        placeholder?: string;
    }>;
}

export interface ContextMenuApi {
    closeContextMenu(): void;
    openContextMenu(
        event: UIEvent,
        render?: Menu["Menu"],
        options?: { enableSpellCheck?: boolean; },
        renderLazy?: () => Promise<Menu["Menu"]>
    ): void;
    openContextMenuLazy(
        event: UIEvent,
        renderLazy?: () => Promise<Menu["Menu"]>,
        options?: { enableSpellCheck?: boolean; }
    ): void;
}

