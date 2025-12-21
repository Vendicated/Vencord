/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ColorPickerProps {
    color: number;
    onChange: (color: number) => void;
    onClose?: () => void;
    suggestedColors?: string[];
    disabled?: boolean;
    label?: React.ReactNode;
    colorPickerMiddle?: React.ReactNode;
    colorPickerFooter?: React.ReactNode;
    showEyeDropper?: boolean;
}

export interface ColorSwatchProps {
    color?: number;
    isDefault?: boolean;
    isCustom?: boolean;
    isSelected?: boolean;
    disabled?: boolean;
    style?: React.CSSProperties;
    onClick?: (colorOrGradient: number | { start: number; end: number; }) => void;
    isGradient?: boolean;
    "aria-label"?: string;
    gradientStart?: number;
    gradientEnd?: number;
    gradientDegrees?: number;
}

export interface DefaultColorButtonProps {
    color: number;
    onChange: (color: number) => void;
    value: number;
    disabled?: boolean;
    allowBlackCustomColor?: boolean;
}

export interface CustomColorButtonProps {
    customColor?: number;
    value: number;
    disabled?: boolean;
    "aria-label"?: string;
    presets: number[];
}

export interface GradientColor {
    start: number;
    end: number;
    name?: string;
}

export interface ColorPickerWithSwatchesProps {
    className?: string;
    defaultColor: number;
    customColor?: number;
    colors: number[] | GradientColor[];
    value: number;
    secondaryValue?: number;
    disabled?: boolean;
    onChange: (color: number, secondaryColor?: number) => void;
    renderDefaultButton?: (props: DefaultColorButtonProps) => React.ReactNode;
    renderCustomButton?: (props: CustomColorButtonProps) => React.ReactNode;
    colorContainerClassName?: string;
    isGradient?: boolean;
    renderGradientCustomButton?: (props: {
        value: number;
        startColor: number;
        endColor: number;
        disabled?: boolean;
    }) => React.ReactNode;
    gradientDegrees?: number;
    allowBlackCustomColor?: boolean;
}
