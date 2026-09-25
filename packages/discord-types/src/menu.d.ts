import type { ComponentType, CSSProperties, ForwardRefRenderFunction, MouseEvent, PropsWithChildren, ReactNode, UIEvent } from "react";
import { LiteralUnion } from "type-fest";

type RC<C> = ComponentType<PropsWithChildren<C & Record<string, any>>>;

type Accessory =
    | {
        type: "icon";
        icon: ComponentType<any>;
        color?: string;
        size?: LiteralUnion<"refresh_sm", string>;
    }
    | {
        type: "emoji";
        emojiId?: string;
        src?: string;
        animated?: boolean;
    }
    | {
        type: "image";
        src: string;
    };

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
        leadingAccessory?: Accessory;

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
        label?: string;
        control: ForwardRefRenderFunction<any, any>;
    }>;
    MenuSliderControl: RC<{
        minValue?: number,
        maxValue?: number,
        value?: number,
        onChange?(value: number): void,
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
