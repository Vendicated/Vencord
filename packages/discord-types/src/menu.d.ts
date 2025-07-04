import type { ComponentType, CSSProperties, MouseEvent, PropsWithChildren, ReactNode, UIEvent } from "react";

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
        label: ReactNode;
        action?(e: MouseEvent): void;
        icon?: ComponentType<any>;

        color?: string;
        render?: ComponentType<any>;
        onChildrenScroll?: Function;
        childRowHeight?: number;
        listClassName?: string;
        disabled?: boolean;
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
    MenuSliderControl: RC<{
        minValue: number,
        maxValue: number,
        value: number,
        onChange(value: number): void,
        renderValue?(value: number): string,
    }>;
    MenuSearchControl: RC<{
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

