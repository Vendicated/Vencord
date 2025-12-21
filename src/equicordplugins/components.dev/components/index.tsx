/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { findByCodeLazy, findComponentByCodeLazy, findLazy } from "@webpack";

import {
    AnchorProps,
    AvatarProps,
    BadgeShapesType,
    CheckboxGroupOption,
    CircleBadgeProps,
    ClickableProps,
    ColorPickerProps,
    ColorPickerWithSwatchesProps,
    ColorSwatchProps,
    CustomColorButtonProps,
    DefaultColorButtonProps,
    GradientColor,
    IconBadgeProps,
    ListboxItem,
    ManaBaseRadioGroupProps,
    ManaButtonProps,
    ManaCalendarProps,
    ManaCheckboxGroupProps,
    ManaCheckboxProps,
    ManaComboboxProps,
    ManaDatePickerProps,
    ManaListboxProps,
    ManaPopoverProps,
    ManaRichTooltipProps,
    ManaSelectOption,
    ManaSelectProps,
    ManaSwitchProps,
    ManaTextAreaProps,
    ManaTextButtonProps,
    ManaTextInputProps,
    ManaTooltipProps,
    NoticeProps,
    NoticeType,
    NumberBadgeProps,
    PaginatorProps,
    PopoverAction,
    ProgressBarProps,
    RadioOption,
    SearchBarProps,
    SliderProps,
    SpinnerProps,
    StandaloneRadioIndicatorProps,
    TabBarComponent,
    TabBarHeaderProps,
    TabBarItemProps,
    TabBarProps,
    TabBarSeparatorProps,
    TextBadgeProps
} from "../types";

export type {
    AnchorProps,
    AvatarProps,
    BadgeShapesType,
    CheckboxGroupOption,
    CircleBadgeProps,
    ColorPickerProps,
    ColorPickerWithSwatchesProps,
    ColorSwatchProps,
    CustomColorButtonProps,
    DefaultColorButtonProps,
    GradientColor,
    IconBadgeProps,
    ListboxItem,
    ManaBaseRadioGroupProps,
    ManaButtonProps,
    ManaCalendarProps,
    ManaCheckboxGroupProps,
    ManaCheckboxProps,
    ManaComboboxProps,
    ManaDatePickerProps,
    ManaListboxProps,
    ManaPopoverProps,
    ManaRichTooltipProps,
    ManaSelectOption,
    ManaSelectProps,
    ManaSwitchProps,
    ManaTextAreaProps,
    ManaTextButtonProps,
    ManaTextInputProps,
    ManaTooltipProps,
    NoticeProps,
    NoticeType,
    NumberBadgeProps,
    PaginatorProps,
    PopoverAction,
    ProgressBarProps,
    RadioOption,
    SearchBarProps,
    SliderProps,
    SpinnerProps,
    StandaloneRadioIndicatorProps,
    TabBarComponent,
    TabBarHeaderProps,
    TabBarItemProps,
    TabBarProps,
    TabBarSeparatorProps,
    TextBadgeProps
};

export const Anchor = findComponentByCodeLazy("anchorUnderlineOnHover", "useDefaultUnderlineStyles") as React.ComponentType<AnchorProps>;

export const ManaButton = findComponentByCodeLazy('"data-mana-component":"button"') as React.ComponentType<ManaButtonProps>;
export const ManaTextButton = findComponentByCodeLazy('"data-mana-component":"text-button"') as React.ComponentType<ManaTextButtonProps>;
export const ManaSwitch = findComponentByCodeLazy('"data-mana-component":"switch"') as React.ComponentType<ManaSwitchProps>;
export const ManaTextInput = findComponentByCodeLazy('"data-mana-component":"text-input"') as React.ComponentType<ManaTextInputProps>;
export const ManaTextArea = findComponentByCodeLazy('"data-mana-component":"text-area"') as React.ComponentType<ManaTextAreaProps>;
export const ManaCheckbox = findComponentByCodeLazy('"data-mana-component":"checkbox"') as React.ComponentType<ManaCheckboxProps>;
export const ManaSelect = findComponentByCodeLazy('"data-mana-component":"select"') as React.ComponentType<ManaSelectProps>;
export const ManaTooltip = findComponentByCodeLazy('"data-mana-component":"tooltip"') as React.ComponentType<ManaTooltipProps>;
export const ManaCalendar = findComponentByCodeLazy('"data-mana-component":"calendar"') as React.ComponentType<ManaCalendarProps>;
export const ManaDatePicker = findComponentByCodeLazy('"data-mana-component":"date-picker"') as React.ComponentType<ManaDatePickerProps>;
export const ManaRichTooltip = findComponentByCodeLazy('"data-mana-component":"rich-tooltip"') as React.ComponentType<ManaRichTooltipProps>;
export const ManaCombobox = findComponentByCodeLazy("itemToString", "multiSelect", "maxVisibleItems") as React.ComponentType<ManaComboboxProps>;
export const ManaListbox = findComponentByCodeLazy('"data-mana-component":"listbox"') as React.ComponentType<ManaListboxProps>;
export const ManaCheckboxGroup = findComponentByCodeLazy('"data-mana-component":"checkbox-group"') as React.ComponentType<ManaCheckboxGroupProps>;
export const ManaBaseRadioGroup = findComponentByCodeLazy('"data-mana-component":"BaseRadioGroup"') as React.ComponentType<ManaBaseRadioGroupProps>;
export const StandaloneRadioIndicator = findComponentByCodeLazy("standaloneRadioIndicator", "animateIn", "animateOut") as React.ComponentType<StandaloneRadioIndicatorProps>;
export const ManaPopover = findComponentByCodeLazy('"data-mana-component":"popover"') as React.ComponentType<ManaPopoverProps>;

export const Slider = findComponentByCodeLazy("stickToMarkers", "onMarkerRender", "grabberClassName") as React.ComponentType<SliderProps>;
export const Avatar = findComponentByCodeLazy("statusTooltip", "statusBackdropColor", "isSpeaking") as React.ComponentType<AvatarProps>;
export const ProgressBar = findComponentByCodeLazy("progressContainer", "labelledBy", "aria-valuenow") as React.ComponentType<ProgressBarProps>;
export const Spinner = findComponentByCodeLazy("spinningCircleSimple", "pulsingEllipsis", "wanderingCubes") as React.ComponentType<SpinnerProps>;
export const SearchBar = findComponentByCodeLazy("#{intl::SEARCH}", "clearable", "autoComplete") as React.ComponentType<SearchBarProps>;
export const Paginator2 = findComponentByCodeLazy("#{intl::BACK}", "#{intl::NEXT}", "renderPageWrapper") as React.ComponentType<PaginatorProps>;
export const Notice = findComponentByCodeLazy("messageType", "iconDiv", "actionContainer") as React.ComponentType<NoticeProps>;
export const ColorPicker = findComponentByCodeLazy("#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}", "showEyeDropper") as React.ComponentType<ColorPickerProps>;

const ColorPickerModule = findLazy(m => {
    const values = Object.values(m);
    return values.length === 4 &&
        values.some(v => typeof v === "function" && v.toString?.().includes('id:"color-picker"')) &&
        values.some(v => typeof v === "function" && v.toString?.().includes("isDefault:!0"));
});

function getColorPickerExport(check: (fn: Function) => boolean): React.ComponentType<any> {
    for (const value of Object.values(ColorPickerModule)) {
        if (typeof value === "function" && check(value)) return value as React.ComponentType<any>;
    }
    return (() => null) as React.ComponentType<any>;
}

export const ColorPickerWithSwatches: React.ComponentType<ColorPickerWithSwatchesProps> = proxyLazy(() =>
    getColorPickerExport(fn => fn.toString().includes('id:"color-picker"'))
);
export const ColorSwatch: React.ComponentType<ColorSwatchProps> = proxyLazy(() =>
    getColorPickerExport(fn => fn.toString().includes("isDefault") && fn.toString().includes("isCustom") && fn.toString().includes("colorPickerSwatch"))
);
export const DefaultColorButton: React.ComponentType<DefaultColorButtonProps> = proxyLazy(() =>
    getColorPickerExport(fn => fn.toString().includes("isDefault:!0") && fn.toString().includes("allowBlackCustomColor"))
);
export const CustomColorButton: React.ComponentType<CustomColorButtonProps> = proxyLazy(() =>
    getColorPickerExport(fn => fn.toString().includes("isCustom:!0") && fn.toString().includes("presets"))
);

const BadgeModule = findLazy(m => {
    const values = Object.values(m);
    return values.length < 15 &&
        values.some(v => typeof v === "function" && v.toString?.().includes("numberBadge")) &&
        values.some(v => typeof v === "object" && (v as BadgeShapesType)?.ROUND && (v as BadgeShapesType)?.ROUND_LEFT);
});

function getBadgeExport(check: (fn: Function) => boolean): React.ComponentType<any> {
    for (const value of Object.values(BadgeModule)) {
        if (typeof value === "function" && check(value)) return value as React.ComponentType<any>;
    }
    return (() => null) as React.ComponentType<any>;
}

export const NumberBadge: React.ComponentType<NumberBadgeProps> = proxyLazy(() => getBadgeExport(fn => fn.toString().includes("numberBadge")));
export const TextBadge: React.ComponentType<TextBadgeProps> = proxyLazy(() => getBadgeExport(fn => fn.toString().includes("textBadge")));
export const IconBadge: React.ComponentType<IconBadgeProps> = proxyLazy(() => getBadgeExport(fn => fn.toString().includes("iconBadge")));
export const CircleBadge: React.ComponentType<CircleBadgeProps> = proxyLazy(() => getBadgeExport(fn => fn.toString().includes("disableColor") && !fn.toString().includes("iconBadge") && !fn.toString().includes("textBadge") && !fn.toString().includes("numberBadge") && !fn.toString().includes("premiumBadge")));
export const BadgeShapes = proxyLazy(() => Object.values(BadgeModule).find(v => typeof v === "object" && (v as BadgeShapesType)?.ROUND) as BadgeShapesType ?? { ROUND: "", ROUND_LEFT: "", ROUND_RIGHT: "", SQUARE: "" });

export const TabBar = findByCodeLazy("this.tabBarRef", "renderChildren") as TabBarComponent;

export const Clickable = findByCodeLazy("ignoreKeyPress", "renderNonInteractive") as React.ComponentType<ClickableProps>;
