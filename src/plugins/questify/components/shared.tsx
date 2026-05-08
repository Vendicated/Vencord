/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { findComponentByCodeLazy } from "@webpack";
import { ColorPicker, Slider } from "@webpack/common";
import type { ComponentProps, ComponentType, JSX, ReactNode } from "react";

import { q } from "../utils/ui";

export function SettingsCard({ children }: { children: ReactNode; }): JSX.Element {
    return (
        <Card variant="primary" className={q("setting")}>
            {children}
        </Card>
    );
}

export function SettingsHeader({ children }: { children: ReactNode; }): JSX.Element {
    return (
        <Heading className={q("setting-header")}>
            {children}
        </Heading>
    );
}

export function SettingsSubheader({ children, className }: { children: ReactNode; className?: string | string[]; }): JSX.Element {
    return (
        <Heading className={q("setting-subheader", className)}>
            {children}
        </Heading>
    );
}

export function SettingsDescription({ children }: { children: ReactNode; }): JSX.Element {
    return (
        <Paragraph className={q("setting-description")}>
            {children}
        </Paragraph>
    );
}

export function SettingsParagraph({ children, className }: { children: ReactNode; className?: string | string[]; }): JSX.Element {
    return (
        <Paragraph className={q("setting-paragraph", className)}>
            {children}
        </Paragraph>
    );
}

function withDimmedClass(className: string | string[] | undefined, dimmed: boolean): string | string[] | undefined {
    if (!dimmed) return className;

    return [
        ...(Array.isArray(className) ? className : [className]),
        "dimmed-settings-item",
    ].filter(c => c !== undefined);
}

export function SettingsNotice({ children, className }: { children: ReactNode; className?: string | string[]; }): JSX.Element {
    return (
        <Paragraph className={q("notice-card", className)}>
            {children}
        </Paragraph>
    );
}

export interface SettingsRowProps {
    children: ReactNode;
    className?: string | string[];
}

export function SettingsRow({ children, className }: SettingsRowProps): JSX.Element {
    return (
        <div className={q("settings-row", className)}>
            {children}
        </div>
    );
}

export interface SettingsRowItemProps {
    children: ReactNode;
    className?: string | string[];
    width?: "fill" | "content";
}

export function SettingsRowItem({
    children,
    className,
    width = "fill",
}: SettingsRowItemProps): JSX.Element {
    return (
        <div className={q(
            "settings-row-item",
            width === "content" ? "settings-row-item-content" : undefined,
            className,
        )}>
            {children}
        </div>
    );
}

export interface ManaSelectOption {
    id: string;
    value: string;
    label: string;
    disabled?: boolean;
}

export interface ManaSelectFormattedOption extends ManaSelectOption {
    description?: ReactNode;
    leading?: ReactNode;
    trailing?: ReactNode;
}

export interface ManaSelectProps {
    options: ManaSelectOption[];
    value?: string | string[] | null;
    onSelectionChange?: (value: string | string[] | null) => void;
    selectionMode?: "single" | "multiple";
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    clearable?: boolean;
    fullWidth?: boolean;
    autoFocus?: boolean;
    closeOnSelect?: boolean;
    shouldFocusWrap?: boolean;
    maxOptionsVisible?: number;
    wrapTags?: boolean;
    formatOption?: (option: ManaSelectOption) => ManaSelectFormattedOption;
    name?: string;
    form?: string;
    autoComplete?: string;
    label?: string;
    required?: boolean;
}

export const ManaSelect = findComponentByCodeLazy('"data-mana-component":"select"') as React.ComponentType<ManaSelectProps>;

export interface SettingsSelectProps extends Omit<ManaSelectProps, "label"> {
    label: ReactNode;
    className?: string | string[];
    labelClassName?: string | string[];
    selectClassName?: string | string[];
    tooltip?: { position: "top" | "bottom", text: string; wider?: boolean; };
}

export function SettingsSelect({
    label,
    className,
    labelClassName,
    selectClassName,
    tooltip,
    ...props
}: SettingsSelectProps): JSX.Element {
    const selectElement = (
        <div className={q("settings-select", className)}>
            <SettingsParagraph className={withDimmedClass(labelClassName, !!props.disabled)}>{label}</SettingsParagraph>
            <div className={q(selectClassName)}>
                <ManaSelect {...props} />
            </div>
        </div>
    );

    if (tooltip) {
        return (
            <SettingsTooltip text={tooltip.text} position={tooltip.position} wider={tooltip.wider}>
                {selectElement}
            </SettingsTooltip>
        );
    }

    return selectElement;
}

type ColorPickerWithOnCloseProps = ComponentProps<typeof ColorPicker> & {
    onClose?: () => void;
};

function ColorPickerWithOnClose(props: ColorPickerWithOnCloseProps): JSX.Element {
    const LiveColorPicker = ColorPicker as ComponentType<ColorPickerWithOnCloseProps>;

    return <LiveColorPicker {...props} />;
}

export interface SettingsColorPickerProps extends ColorPickerWithOnCloseProps {
    className?: string | string[];
    label?: ReactNode;
    labelClassName?: string | string[];
}

export function SettingsColorPicker({
    className,
    label,
    labelClassName,
    ...props
}: SettingsColorPickerProps): JSX.Element {
    return (
        <>
            {label != null && <SettingsParagraph className={withDimmedClass(labelClassName, !!props.disabled)}>{label}</SettingsParagraph>}
            <div className={q("settings-color-picker", className)}>
                <ColorPickerWithOnClose {...props} />
            </div>
        </>
    );
}

export interface SettingsSliderProps {
    className?: string | string[];
    disabled?: boolean;
    label: ReactNode;
    labelClassName?: string | string[];
    maxValue?: number;
    minValue?: number;
    onChange: (value: number) => void;
    sliderClassName?: string | string[];
    value: number;
}

export function SettingsSlider({
    className,
    disabled,
    label,
    labelClassName,
    maxValue = 100,
    minValue = 0,
    onChange,
    sliderClassName,
    value,
}: SettingsSliderProps): JSX.Element {
    return (
        <div className={q("settings-slider", className)}>
            <SettingsParagraph className={withDimmedClass(labelClassName, !!disabled)}>{label}</SettingsParagraph>
            <div className={q("settings-slider-control-container")}>
                <Slider
                    minValue={minValue}
                    maxValue={maxValue}
                    initialValue={value}
                    onValueChange={onChange}
                    className={q("settings-slider-control", sliderClassName)}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}

interface SwitchWithLabelProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
}

interface SettingsSwitchLayoutProps extends SwitchWithLabelProps {
    bottomSpacing?: "5" | "10" | "15";
    topSpacing?: "5" | "10" | "15";
    className?: string | string[];
    tooltip?: { position: "top" | "bottom", text: string; };
}

const SwitchWithLabel = findComponentByCodeLazy('"data-toggleable-component":"switch"') as React.ComponentType<SwitchWithLabelProps>;

export type SettingsSubtleSwitchProps = Omit<SettingsSwitchLayoutProps, "description">;

export function SettingsSubtleSwitch(props: SettingsSubtleSwitchProps): JSX.Element {
    const switchElement = (
        <div className={q(
            "setting-subtle-switch",
            props.topSpacing ? `margin-top-${props.topSpacing}` : undefined,
            props.bottomSpacing ? `margin-bottom-${props.bottomSpacing}` : undefined,
            withDimmedClass(props.className, !!props.disabled)
        )}>
            <SwitchWithLabel {...props} />
        </div>
    );

    if (props.tooltip) {
        return (
            <SettingsTooltip text={props.tooltip.text} aria-label={props.tooltip.text} position={props.tooltip.position}>
                {switchElement}
            </SettingsTooltip>
        );
    }

    return switchElement;
}

export const TooltipPositions = ["top", "bottom", "left", "right"] as const;
export type TooltipPosition = typeof TooltipPositions[number];

export const TooltipAligns = ["start", "center", "end"] as const;
export type TooltipAlign = typeof TooltipAligns[number];

export const TooltipColors = ["primary", "grey", "brand", "green", "red"] as const;
export type TooltipColor = typeof TooltipColors[number];

export interface ManaTooltipProps {
    text: string | (() => React.ReactNode);
    position?: TooltipPosition;
    align?: TooltipAlign;
    color?: TooltipColor;
    spacing?: number;
    hideOnClick?: boolean;
    delay?: number;
    forceOpen?: boolean;
    shouldShow?: boolean;
    allowOverflow?: boolean;
    overflowOnly?: boolean;
    clickableOnMobile?: boolean;
    disableTooltipPointerEvents?: boolean;
    targetElementRef?: React.RefObject<HTMLElement>;
    tooltipClassName?: string;
    tooltipStyle?: React.CSSProperties;
    tooltipContentClassName?: string;
    tooltipPointerClassName?: string;
    positionKeyStemOverride?: string;
    onTooltipShow?: () => void;
    onTooltipHide?: () => void;
    onAnimationRest?: () => void;
    "aria-label"?: string | false;
    children: (props: Record<string, any>) => React.ReactNode;
}

export const ManaTooltip = findComponentByCodeLazy("VoidTooltip cannot find DOM node") as React.ComponentType<ManaTooltipProps>;

function SettingsTooltip({
    children,
    position,
    text,
    wider,
    className
}: {
    children: ReactNode;
    position: "top" | "bottom";
    text: string;
    wider?: boolean;
    className?: string | string[];
}): JSX.Element {
    return (
        <div className={q("settings-tooltip-wrapper", className)}>
            <ManaTooltip
                text={text}
                position={position}
                color="brand"
                tooltipStyle={{ maxWidth: wider ? "602px" : "350px" }}
                tooltipContentClassName={q("settings-tooltip-content")}
                delay={50}
            >
                {tooltipProps => <div {...tooltipProps}>{children}</div>}
            </ManaTooltip>
        </div>
    );
}

export const ManaButtonVariants = ["primary", "secondary", "critical-primary", "critical-secondary", "active", "overlay-primary", "overlay-secondary", "expressive"] as const;
export type ManaButtonVariant = typeof ManaButtonVariants[number];

export const ManaButtonSizes = ["xs", "sm", "md"] as const;
export type ManaButtonSize = typeof ManaButtonSizes[number];

export interface ManaButtonProps {
    text?: string;
    variant?: ManaButtonVariant;
    size?: ManaButtonSize;
    disabled?: boolean;
    fullWidth?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
}

export const ManaButton = findComponentByCodeLazy('"data-mana-component":"button"') as React.ComponentType<ManaButtonProps>;
