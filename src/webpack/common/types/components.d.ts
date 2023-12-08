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

import type { Moment } from "moment";
import type { ComponentType, CSSProperties, FunctionComponent, HtmlHTMLAttributes, HTMLProps, KeyboardEvent, MouseEvent, PropsWithChildren, PropsWithRef, ReactNode, Ref } from "react";

export type TextVariant = "heading-sm/normal" | "heading-sm/medium" | "heading-sm/semibold" | "heading-sm/bold" | "heading-md/normal" | "heading-md/medium" | "heading-md/semibold" | "heading-md/bold" | "heading-lg/normal" | "heading-lg/medium" | "heading-lg/semibold" | "heading-lg/bold" | "heading-xl/normal" | "heading-xl/medium" | "heading-xl/bold" | "heading-xxl/normal" | "heading-xxl/medium" | "heading-xxl/bold" | "eyebrow" | "heading-deprecated-14/normal" | "heading-deprecated-14/medium" | "heading-deprecated-14/bold" | "text-xxs/normal" | "text-xxs/medium" | "text-xxs/semibold" | "text-xxs/bold" | "text-xs/normal" | "text-xs/medium" | "text-xs/semibold" | "text-xs/bold" | "text-sm/normal" | "text-sm/medium" | "text-sm/semibold" | "text-sm/bold" | "text-md/normal" | "text-md/medium" | "text-md/semibold" | "text-md/bold" | "text-lg/normal" | "text-lg/medium" | "text-lg/semibold" | "text-lg/bold" | "display-sm" | "display-md" | "display-lg" | "code";
export type FormTextTypes = Record<"DEFAULT" | "INPUT_PLACEHOLDER" | "DESCRIPTION" | "LABEL_BOLD" | "LABEL_SELECTED" | "LABEL_DESCRIPTOR" | "ERROR" | "SUCCESS", string>;
export type Heading = `h${1 | 2 | 3 | 4 | 5 | 6}`;

export type Margins = Record<"marginTop16" | "marginTop8" | "marginBottom8" | "marginTop20" | "marginBottom20", string>;
export type ButtonLooks = Record<"FILLED" | "INVERTED" | "OUTLINED" | "LINK" | "BLANK", string>;

export type TextProps = PropsWithChildren<HtmlHTMLAttributes<HTMLDivElement> & {
    variant?: TextVariant;
    tag?: "div" | "span" | "p" | "strong" | Heading;
    selectable?: boolean;
    lineClamp?: number;
}>;

export type Text = ComponentType<TextProps>;

export type FormTitle = ComponentType<HTMLProps<HTMLTitleElement> & PropsWithChildren<{
    /** default is h5 */
    tag?: Heading;
    faded?: boolean;
    disabled?: boolean;
    required?: boolean;
    error?: ReactNode;
}>>;

export type FormSection = ComponentType<PropsWithChildren<{
    /** default is h5 */
    tag?: Heading;
    className?: string;
    titleClassName?: string;
    titleId?: string;
    title?: ReactNode;
    disabled?: boolean;
    htmlFor?: unknown;
}>>;

export type FormDivider = ComponentType<{
    className?: string;
    style?: CSSProperties;
}>;


export type FormText = ComponentType<PropsWithChildren<{
    disabled?: boolean;
    selectable?: boolean;
    /** defaults to FormText.Types.DEFAULT */
    type?: string;
}> & TextProps> & { Types: FormTextTypes; };

export type Tooltip = ComponentType<{
    text: ReactNode;
    children: FunctionComponent<{
        onClick(): void;
        onMouseEnter(): void;
        onMouseLeave(): void;
        onContextMenu(): void;
        onFocus(): void;
        onBlur(): void;
        "aria-label"?: string;
    }>;
    "aria-label"?: string;

    allowOverflow?: boolean;
    forceOpen?: boolean;
    hide?: boolean;
    hideOnClick?: boolean;
    shouldShow?: boolean;
    spacing?: number;

    /** Tooltip.Colors.BLACK */
    color?: string;
    /** TooltipPositions.TOP */
    position?: string;

    tooltipClassName?: string;
    tooltipContentClassName?: string;
}> & {
    Colors: Record<"BLACK" | "BRAND" | "CUSTOM" | "GREEN" | "GREY" | "PRIMARY" | "RED" | "YELLOW", string>;
};

export type TooltipPositions = Record<"BOTTOM" | "CENTER" | "LEFT" | "RIGHT" | "TOP" | "WINDOW_CENTER", string>;

export type Card = ComponentType<PropsWithChildren<HTMLProps<HTMLDivElement> & {
    editable?: boolean;
    outline?: boolean;
    /** Card.Types.PRIMARY */
    type?: string;
}>> & {
    Types: Record<"BRAND" | "CUSTOM" | "DANGER" | "PRIMARY" | "SUCCESS" | "WARNING", string>;
};

export type Button = ComponentType<PropsWithChildren<Omit<HTMLProps<HTMLButtonElement>, "size"> & {
    /** Button.Looks.FILLED */
    look?: string;
    /** Button.Colors.BRAND */
    color?: string;
    /** Button.Sizes.MEDIUM */
    size?: string;
    /** Button.BorderColors.BLACK */
    borderColor?: string;

    wrapperClassName?: string;
    className?: string;
    innerClassName?: string;

    buttonRef?: Ref<HTMLButtonElement>;
    focusProps?: any;
    submitting?: boolean;

    submittingStartedLabel?: string;
    submittingFinishedLabel?: string;
}>> & {
    BorderColors: Record<"BLACK" | "BRAND" | "BRAND_NEW" | "GREEN" | "LINK" | "PRIMARY" | "RED" | "TRANSPARENT" | "WHITE" | "YELLOW", string>;
    Colors: Record<"BRAND" | "RED" | "GREEN" | "YELLOW" | "PRIMARY" | "LINK" | "WHITE" | "BLACK" | "TRANSPARENT" | "BRAND_NEW" | "CUSTOM", string>;
    Hovers: Record<"DEFAULT" | "BRAND" | "RED" | "GREEN" | "YELLOW" | "PRIMARY" | "LINK" | "WHITE" | "BLACK" | "TRANSPARENT", string>;
    Looks: Record<"FILLED" | "INVERTED" | "OUTLINED" | "LINK" | "BLANK", string>;
    Sizes: Record<"NONE" | "TINY" | "SMALL" | "MEDIUM" | "LARGE" | "XLARGE" | "MIN" | "MAX" | "ICON", string>;

    Link: any;
};

export type Switch = ComponentType<PropsWithChildren<{
    value: boolean;
    onChange(value: boolean): void;

    disabled?: boolean;
    hideBorder?: boolean;
    className?: string;
    style?: CSSProperties;

    note?: ReactNode;
    tooltipNote?: ReactNode;
}>>;

export type Timestamp = ComponentType<PropsWithChildren<{
    timestamp: Moment;
    isEdited?: boolean;

    className?: string;
    id?: string;

    cozyAlt?: boolean;
    compact?: boolean;
    isInline?: boolean;
    isVisibleOnlyOnHover?: boolean;
}>>;

export type TextInput = ComponentType<PropsWithChildren<{
    name?: string;
    onChange?(value: string, name?: string): void;
    placeholder?: string;
    editable?: boolean;
    maxLength?: number;
    error?: string;

    inputClassName?: string;
    inputPrefix?: string;
    inputRef?: Ref<HTMLInputElement>;
    prefixElement?: ReactNode;

    focusProps?: any;

    /** TextInput.Sizes.DEFAULT */
    size?: string;
} & Omit<HTMLProps<HTMLInputElement>, "onChange">>> & {
    Sizes: Record<"DEFAULT" | "MINI", string>;
};

export type TextArea = ComponentType<PropsWithRef<Omit<HTMLProps<HTMLTextAreaElement>, "onChange"> & {
    onChange(v: string): void;
}>>;

interface SelectOption {
    disabled?: boolean;
    value: any;
    label: string;
    key?: React.Key;
    default?: boolean;
}

export type Select = ComponentType<PropsWithChildren<{
    placeholder?: string;
    options: ReadonlyArray<SelectOption>; // TODO

    /**
     * - 0 ~ Filled
     * - 1 ~ Custom
     */
    look?: 0 | 1;
    className?: string;
    popoutClassName?: string;
    popoutPosition?: "top" | "left" | "right" | "bottom" | "center" | "window_center";
    optionClassName?: string;

    autoFocus?: boolean;
    isDisabled?: boolean;
    clearable?: boolean;
    closeOnSelect?: boolean;
    hideIcon?: boolean;

    select(value: any): void;
    isSelected(value: any): boolean;
    serialize(value: any): string;
    clear?(): void;

    maxVisibleItems?: number;
    popoutWidth?: number;

    onClose?(): void;
    onOpen?(): void;

    renderOptionLabel?(option: SelectOption): ReactNode;
    /** discord stupid this gets all options instead of one yeah */
    renderOptionValue?(option: SelectOption[]): ReactNode;

    "aria-label"?: boolean;
    "aria-labelledby"?: boolean;
}>>;

export type SearchableSelect = ComponentType<PropsWithChildren<{
    placeholder?: string;
    options: ReadonlyArray<SelectOption>; // TODO
    value?: SelectOption;

    /**
     * - 0 ~ Filled
     * - 1 ~ Custom
     */
    look?: 0 | 1;
    className?: string;
    popoutClassName?: string;
    wrapperClassName?: string;
    popoutPosition?: "top" | "left" | "right" | "bottom" | "center" | "window_center";
    optionClassName?: string;

    autoFocus?: boolean;
    isDisabled?: boolean;
    clearable?: boolean;
    closeOnSelect?: boolean;
    clearOnSelect?: boolean;
    multi?: boolean;

    onChange(value: any): void;
    onSearchChange?(value: string): void;

    onClose?(): void;
    onOpen?(): void;
    onBlur?(): void;

    renderOptionPrefix?(option: SelectOption): ReactNode;
    renderOptionSuffix?(option: SelectOption): ReactNode;

    filter?(option: SelectOption[], query: string): SelectOption[];

    centerCaret?: boolean;
    debounceTime?: number;
    maxVisibleItems?: number;
    popoutWidth?: number;

    "aria-labelledby"?: boolean;
}>>;

export type Slider = ComponentType<PropsWithChildren<{
    initialValue: number;
    defaultValue?: number;
    keyboardStep?: number;
    maxValue?: number;
    minValue?: number;
    markers?: number[];
    stickToMarkers?: boolean;

    /** 0 above, 1 below */
    markerPosition?: 0 | 1;
    orientation?: "horizontal" | "vertical";

    getAriaValueText?(currentValue: number): string;
    renderMarker?(marker: number): ReactNode;
    onMarkerRender?(marker: number): ReactNode;
    onValueRender?(value: number): ReactNode;
    onValueChange?(value: number): void;
    asValueChanges?(value: number): void;

    className?: string;
    disabled?: boolean;
    handleSize?: number;
    mini?: boolean;
    hideBubble?: boolean;

    fillStyles?: CSSProperties;
    barStyles?: CSSProperties;
    grabberStyles?: CSSProperties;
    grabberClassName?: string;
    barClassName?: string;

    "aria-hidden"?: boolean;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
}>>;

// TODO - type maybe idk probably not that useful other than the constants
export type Flex = ComponentType<PropsWithChildren<any>> & {
    Align: Record<"START" | "END" | "CENTER" | "STRETCH" | "BASELINE", string>;
    Direction: Record<"VERTICAL" | "HORIZONTAL" | "HORIZONTAL_REVERSE", string>;
    Justify: Record<"START" | "END" | "CENTER" | "BETWEEN" | "AROUND", string>;
    Wrap: Record<"NO_WRAP" | "WRAP" | "WRAP_REVERSE", string>;
};

declare enum PopoutAnimation {
    NONE = "1",
    TRANSLATE = "2",
    SCALE = "3",
    FADE = "4"
}

export type Popout = ComponentType<{
    children(
        thing: {
            "aria-controls": string;
            "aria-expanded": boolean;
            onClick(event: MouseEvent<HTMLElement>): void;
            onKeyDown(event: KeyboardEvent<HTMLElement>): void;
            onMouseDown(event: MouseEvent<HTMLElement>): void;
        },
        data: {
            isShown: boolean;
            position: string;
        }
    ): ReactNode;
    shouldShow?: boolean;
    renderPopout(args: {
        closePopout(): void;
        isPositioned: boolean;
        nudge: number;
        position: string;
        setPopoutRef(ref: any): void;
        updatePosition(): void;
    }): ReactNode;

    onRequestOpen?(): void;
    onRequestClose?(): void;

    /** "center" and others */
    align?: string;
    /** Popout.Animation */
    animation?: PopoutAnimation;
    autoInvert?: boolean;
    nudgeAlignIntoViewport?: boolean;
    /** "bottom" and others */
    position?: string;
    positionKey?: string;
    spacing?: number;
}> & {
    Animation: typeof PopoutAnimation;
};

export type Dialog = ComponentType<PropsWithChildren<any>>;

type Resolve = (data: { theme: "light" | "dark", saturation: number; }) => {
    hex(): string;
    hsl(): string;
    int(): number;
    spring(): string;
};

export type useToken = (color: {
    css: string;
    resolve: Resolve;
}) => ReturnType<Resolve>;

export type Paginator = ComponentType<{
    currentPage: number;
    maxVisiblePages: number;
    pageSize: number;
    totalCount: number;

    onPageChange?(page: number): void;
    hideMaxPage?: boolean;
}>;

export type MaskedLink = ComponentType<PropsWithChildren<{
    href: string;
    rel?: string;
    target?: string;
    title?: string,
    className?: string;
    tabIndex?: number;
    onClick?(): void;
    trusted?: boolean;
    messageId?: string;
    channelId?: string;
}>>;

export type ScrollerThin = ComponentType<PropsWithChildren<{
    className?: string;
    style?: CSSProperties;

    dir?: "ltr";
    orientation?: "horizontal" | "vertical";
    paddingFix?: boolean;
    fade?: boolean;

    onClose?(): void;
    onScroll?(): void;
}>>;

export type Clickable = ComponentType<PropsWithChildren<{
    className?: string;

    href?: string;
    ignoreKeyPress?: boolean;

    onClick?(): void;
    onKeyPress?(): void;
}>>;

export type Avatar = ComponentType<PropsWithChildren<{
    className?: string;

    src?: string;
    size?: "SIZE_16" | "SIZE_20" | "SIZE_24" | "SIZE_32" | "SIZE_40" | "SIZE_48" | "SIZE_56" | "SIZE_80" | "SIZE_120";

    statusColor?: string;
    statusTooltip?: string;
    statusBackdropColor?: string;

    isMobile?: boolean;
    isTyping?: boolean;
    isSpeaking?: boolean;

    typingIndicatorRef?: unknown;

    "aria-hidden"?: boolean;
    "aria-label"?: string;
}>>;
