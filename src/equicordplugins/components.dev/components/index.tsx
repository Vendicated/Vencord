/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { TooltipContainer } from "@components/TooltipContainer";
import { proxyLazy } from "@utils/lazy";
import { filters, findByCodeLazy, findByPropsLazy, findComponentByCodeLazy, findLazy, mapMangledModuleLazy } from "@webpack";
import {
    GuildStore,
    ListScrollerAuto,
    ListScrollerNone,
    ListScrollerThin,
    OAuth2AuthorizeModal,
    ScrollerAuto,
    ScrollerNone,
    ScrollerThin,
    SearchableSelect,
    TabBar,
    useEffect,
    useRef,
    UserStore,
    useState,
} from "@webpack/common";

import { ToastPosition, ToastType } from "../constants";
import type {
    AccordionProps,
    AnchorProps,
    AvatarProps,
    BadgeShapesType,
    ChipProps,
    CircleBadgeProps,
    ClickableProps,
    ColorPickerProps,
    ColorPickerWithSwatchesProps,
    ColorSwatchProps,
    ConfirmModalProps,
    CustomColorButtonProps,
    DefaultColorButtonProps,
    DiscordHeadingProps,
    DiscordTextProps,
    ExpressiveModalProps,
    FocusLockProps,
    GuildIconProps,
    IconBadgeProps,
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
    ManaSelectProps,
    ManaSwitchProps,
    ManaTextAreaProps,
    ManaTextButtonProps,
    ManaTextInputProps,
    ManaTooltipProps,
    ModalProps,
    ModalRenderFn,
    NoticeProps,
    NumberBadgeProps,
    OpenModalOptions,
    PaginatorProps,
    PopoutComponent,
    ProgressBarProps,
    SearchBarProps,
    SkeletonProps,
    SliderProps,
    SpinnerComponent,
    StandaloneRadioIndicatorProps,
    TextBadgeProps,
    TimestampProps,
    ToastData,
    ToastOptions,
    ToastsModule,
    ToastTypeValue,
    UserSummaryItemProps,
} from "../types";

export * from "../constants";
export type * from "../types";

export {
    Button,
    Card,
    GuildStore,
    Heading,
    ListScrollerAuto,
    ListScrollerNone,
    ListScrollerThin,
    OAuth2AuthorizeModal,
    Paragraph,
    ScrollerAuto,
    ScrollerNone,
    ScrollerThin,
    SearchableSelect,
    TabBar,
    TooltipContainer,
    useEffect,
    useRef,
    UserStore,
    useState,
};

export const Anchor = findComponentByCodeLazy("anchorUnderlineOnHover", "useDefaultUnderlineStyles") as React.ComponentType<AnchorProps>;
export const Clickable = findByCodeLazy("ignoreKeyPress", "renderNonInteractive") as React.ComponentType<ClickableProps>;

export const ManaButton = findComponentByCodeLazy('"data-mana-component":"button"') as React.ComponentType<ManaButtonProps>;
export const ManaTextButton = findComponentByCodeLazy('"data-mana-component":"text-button"') as React.ComponentType<ManaTextButtonProps>;
export const ManaSwitch = findComponentByCodeLazy('"data-mana-component":"switch"') as React.ComponentType<ManaSwitchProps>;
export const ManaTextInput = findComponentByCodeLazy('"data-mana-component":"text-input"') as React.ComponentType<ManaTextInputProps>;
export const ManaTextArea = findComponentByCodeLazy('"data-mana-component":"text-area"') as React.ComponentType<ManaTextAreaProps>;
export const ManaCheckbox = findComponentByCodeLazy('"data-mana-component":"checkbox"') as React.ComponentType<ManaCheckboxProps>;
export const ManaSelect = findComponentByCodeLazy('"data-mana-component":"select"') as React.ComponentType<ManaSelectProps>;
export const ManaCalendar = findComponentByCodeLazy('"data-mana-component":"calendar"') as React.ComponentType<ManaCalendarProps>;
export const ManaDatePicker = findComponentByCodeLazy('"data-mana-component":"date-picker"') as React.ComponentType<ManaDatePickerProps>;
export const ManaListbox = findComponentByCodeLazy('"data-mana-component":"listbox"') as React.ComponentType<ManaListboxProps>;
export const ManaCheckboxGroup = findComponentByCodeLazy('"data-mana-component":"checkbox-group"') as React.ComponentType<ManaCheckboxGroupProps>;
export const ManaBaseRadioGroup = findComponentByCodeLazy('"data-mana-component":"BaseRadioGroup"') as React.ComponentType<ManaBaseRadioGroupProps>;
export const ManaCombobox = findComponentByCodeLazy("itemToString", "multiSelect", "maxVisibleItems") as React.ComponentType<ManaComboboxProps>;
export const ManaTooltip = findComponentByCodeLazy("VoidTooltip cannot find DOM node") as React.ComponentType<ManaTooltipProps>;
export const ManaRichTooltip = findComponentByCodeLazy('"data-mana-component":"rich-tooltip"') as React.ComponentType<ManaRichTooltipProps>;
export const ManaPopover = findByCodeLazy("title", "body", "badge", "graphic", "actions", "textLink", "gradientColor", "popoverRef") as React.ComponentType<ManaPopoverProps>;
export const StandaloneRadioIndicator = findComponentByCodeLazy("standaloneRadioIndicator", "animateIn", "animateOut") as React.ComponentType<StandaloneRadioIndicatorProps>;

export const Slider = findComponentByCodeLazy("stickToMarkers", "onMarkerRender", "grabberClassName") as React.ComponentType<SliderProps>;
export const Avatar = findComponentByCodeLazy("statusTooltip", "statusBackdropColor", "isSpeaking") as React.ComponentType<AvatarProps>;
export const ProgressBar = findComponentByCodeLazy("progressContainer", "labelledBy", "aria-valuenow") as React.ComponentType<ProgressBarProps>;
export const Spinner = findComponentByCodeLazy("spinningCircleSimple", "pulsingEllipsis", "wanderingCubes") as unknown as SpinnerComponent;
export const SearchBar = findComponentByCodeLazy("#{intl::SEARCH}", "clearable", "autoComplete") as React.ComponentType<SearchBarProps>;
export const Paginator = findComponentByCodeLazy("#{intl::BACK}", "#{intl::NEXT}", "renderPageWrapper") as React.ComponentType<PaginatorProps>;
export const Notice = findComponentByCodeLazy("messageType", "iconDiv", "actionContainer") as React.ComponentType<NoticeProps>;
export const Chip = findComponentByCodeLazy('variant:"eyebrow"', "chip,") as React.ComponentType<ChipProps>;
export const Skeleton = findComponentByCodeLazy("productSkeletonCardContainer", "skipPulseAnimation") as React.ComponentType<SkeletonProps>;
export const Accordion = findComponentByCodeLazy("accordionContainer", "onExpandedChange", "defaultExpanded") as React.ComponentType<AccordionProps>;
export const Timestamp = findComponentByCodeLazy("#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}", "isVisibleOnlyOnHover") as React.ComponentType<TimestampProps>;
export const GuildIcon = findComponentByCodeLazy("Masks.CLAN_ICON", "guildIconImage") as React.ComponentType<GuildIconProps>;
export const ColorPicker = findComponentByCodeLazy("#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}", "showEyeDropper") as React.ComponentType<ColorPickerProps>;
export const Popout: PopoutComponent = proxyLazy(() => findLazy(m => m?.y?.Animation && m.y.toString?.().includes("renderPopout")).y);
export const FocusLock = findComponentByCodeLazy(".containerRef,{keyboardModeEnabled:") as React.ComponentType<FocusLockProps>;
export const UserSummaryItem = findComponentByCodeLazy("popoutUserId") as React.ComponentType<UserSummaryItemProps>;

export const Animations = mapMangledModuleLazy(".assign({colorNames:", {
    Transition: filters.componentByCode('["items","children"]', ",null,"),
    animated: filters.byProps("div", "text")
});

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

export const NumberBadge: React.ComponentType<NumberBadgeProps> = proxyLazy(() =>
    getBadgeExport(fn => fn.toString().includes("numberBadge"))
);
export const TextBadge: React.ComponentType<TextBadgeProps> = proxyLazy(() =>
    getBadgeExport(fn => fn.toString().includes("textBadge"))
);
export const IconBadge: React.ComponentType<IconBadgeProps> = proxyLazy(() =>
    getBadgeExport(fn => fn.toString().includes("iconBadge"))
);
export const CircleBadge: React.ComponentType<CircleBadgeProps> = proxyLazy(() =>
    getBadgeExport(fn =>
        fn.toString().includes("disableColor") &&
        !fn.toString().includes("iconBadge") &&
        !fn.toString().includes("textBadge") &&
        !fn.toString().includes("numberBadge") &&
        !fn.toString().includes("premiumBadge")
    )
);
export const BadgeShapes = proxyLazy(() =>
    Object.values(BadgeModule).find(v => typeof v === "object" && (v as BadgeShapesType)?.ROUND) as BadgeShapesType ??
    { ROUND: "", ROUND_LEFT: "", ROUND_RIGHT: "", SQUARE: "" }
);

const ToastsModule = findByPropsLazy("showToast", "popToast");
export const Toasts: ToastsModule = proxyLazy(() => ({
    Type: ToastType,
    Position: ToastPosition,
    genId: () => Math.random().toString(36).slice(2),
    show: (toast: ToastData) => ToastsModule.showToast(toast),
    pop: () => ToastsModule.popToast(),
    create: (message: string, type: ToastTypeValue, options?: ToastOptions) => ToastsModule.createToast(message, type, options),
}));

export const showToast = (message: string, type: ToastTypeValue = ToastType.MESSAGE) =>
    ToastsModule.showToast(ToastsModule.createToast(message, type));

const ModalModule = findByPropsLazy("Modal", "ConfirmModal");
const ModalAPIModule = findByPropsLazy("openModal", "closeModal");

export const Modal: React.ComponentType<ModalProps> = proxyLazy(() => ModalModule.Modal);
export const ConfirmModal: React.ComponentType<ConfirmModalProps> = proxyLazy(() => ModalModule.ConfirmModal);
export const ExpressiveModal: React.ComponentType<ExpressiveModalProps> = proxyLazy(() => ModalModule.ExpressiveModal);

export const openModal = (render: ModalRenderFn, options?: OpenModalOptions): string =>
    ModalAPIModule.openModal(render, options);
export const closeModal = (modalKey: string): void =>
    ModalAPIModule.closeModal(modalKey);
export const closeAllModals = (): void =>
    ModalAPIModule.closeAllModals();
export const hasModalOpen = (modalKey: string): boolean =>
    ModalAPIModule.hasModalOpen(modalKey);
export const hasAnyModalOpen = (): boolean =>
    ModalAPIModule.hasAnyModalOpen();

const DiscordTextModule = findByPropsLazy("Heading", "Text");

export function DiscordHeading(props: DiscordHeadingProps) {
    return <DiscordTextModule.Heading {...props} />;
}

export function DiscordText(props: DiscordTextProps) {
    return <DiscordTextModule.Text {...props} />;
}

export function Divider({ className, style, ...restProps }: React.ComponentPropsWithoutRef<"hr">) {
    return <hr className={`vc-divider${className ? ` ${className}` : ""}`} style={style} {...restProps} />;
}
