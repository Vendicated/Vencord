/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const ManaButtonVariants = ["primary", "secondary", "critical-primary", "critical-secondary", "overlay-primary", "overlay-secondary", "expressive"] as const;
export type ManaButtonVariant = typeof ManaButtonVariants[number];

export const ManaButtonSizes = ["xs", "sm", "md"] as const;
export type ManaButtonSize = typeof ManaButtonSizes[number];

export const ManaTextButtonVariants = ["primary", "secondary", "always-white", "critical"] as const;
export type ManaTextButtonVariant = typeof ManaTextButtonVariants[number];

export const AvatarSizes = ["SIZE_16", "SIZE_20", "SIZE_24", "SIZE_32", "SIZE_40", "SIZE_44", "SIZE_48", "SIZE_56", "SIZE_72", "SIZE_80", "SIZE_96", "SIZE_120", "SIZE_152"] as const;
export type AvatarSize = typeof AvatarSizes[number];

export const AvatarStatuses = ["online", "idle", "dnd", "offline", "streaming"] as const;
export type AvatarStatus = typeof AvatarStatuses[number];

export const GuildIconSizes = [16, 20, 24, 32, 40, 48, 56, 80, 96] as const;
export type GuildIconSize = typeof GuildIconSizes[number];

export const CardVariants = ["normal", "warning", "danger"] as const;
export type CardVariant = typeof CardVariants[number];

export const SpinnerTypes = ["wanderingCubes", "chasingDots", "pulsingEllipsis", "spinningCircle", "spinningCircleSimple", "lowMotion"] as const;
export type SpinnerType = typeof SpinnerTypes[number];

export const TooltipPositions = ["top", "bottom", "left", "right"] as const;
export type TooltipPosition = typeof TooltipPositions[number];

export const TooltipAligns = ["start", "center", "end"] as const;
export type TooltipAlign = typeof TooltipAligns[number];

export const TooltipColors = ["primary", "black", "grey", "brand", "green", "yellow", "red"] as const;
export type TooltipColor = typeof TooltipColors[number];

export const TextInputSizes = ["sm", "md"] as const;
export type TextInputSize = typeof TextInputSizes[number];

export const TimestampFormats = [
    { format: "R", label: "Relative", example: "2 hours ago" },
    { format: "t", label: "Short Time", example: "9:30 PM" },
    { format: "T", label: "Long Time", example: "9:30:00 PM" },
    { format: "d", label: "Short Date", example: "01/20/2024" },
    { format: "D", label: "Long Date", example: "January 20, 2024" },
    { format: "f", label: "Short DateTime", example: "January 20, 2024 9:30 PM" },
    { format: "F", label: "Long DateTime", example: "Saturday, January 20, 2024 9:30 PM" },
] as const;

export const ModalSizes = [
    { size: "small", width: "440px" },
    { size: "medium", width: "600px" },
    { size: "large", width: "720px" },
    { size: "dynamic", width: "fit-content" },
] as const;
export type ModalSize = typeof ModalSizes[number]["size"];

export const TextColors = [
    "text-default", "text-muted", "text-subtle", "text-strong", "text-normal",
    "text-link", "text-brand", "text-disabled", "text-invert",
    "text-feedback-critical", "text-feedback-warning", "text-feedback-info", "text-feedback-positive",
    "text-status-online", "text-status-idle", "text-status-dnd", "text-status-offline",
    "text-overlay-dark", "text-overlay-light",
] as const;
export type TextColorType = typeof TextColors[number];

export const TextSizes = [
    { name: "xxs", value: "0.625rem", pixels: "10px" },
    { name: "xs", value: "0.75rem", pixels: "12px" },
    { name: "sm", value: "0.875rem", pixels: "14px" },
    { name: "md", value: "1rem", pixels: "16px" },
    { name: "lg", value: "1.25rem", pixels: "20px" },
    { name: "xl", value: "1.5rem", pixels: "24px" },
    { name: "xxl", value: "2rem", pixels: "32px" },
] as const;
export type TextSizeType = typeof TextSizes[number]["name"];

export const TextWeights = [
    { name: "thin", value: "100" },
    { name: "extralight", value: "200" },
    { name: "light", value: "300" },
    { name: "normal", value: "400" },
    { name: "medium", value: "500" },
    { name: "semibold", value: "600" },
    { name: "bold", value: "700" },
    { name: "extrabold", value: "800" },
] as const;
export type TextWeightType = typeof TextWeights[number]["name"];

export const TextVariants = [
    "text-xxl/bold", "text-xxl/semibold", "text-xxl/medium", "text-xxl/normal",
    "text-xl/bold", "text-xl/semibold", "text-xl/medium", "text-xl/normal",
    "text-lg/bold", "text-lg/semibold", "text-lg/medium", "text-lg/normal",
    "text-md/bold", "text-md/semibold", "text-md/medium", "text-md/normal",
    "text-sm/bold", "text-sm/semibold", "text-sm/medium", "text-sm/normal",
    "text-xs/bold", "text-xs/semibold", "text-xs/medium", "text-xs/normal",
] as const;
export type TextVariantType = typeof TextVariants[number];

export const HeadingVariants = [
    "heading-xxl/extrabold", "heading-xxl/bold", "heading-xxl/semibold", "heading-xxl/medium", "heading-xxl/normal",
    "heading-xl/extrabold", "heading-xl/bold", "heading-xl/semibold", "heading-xl/medium",
    "heading-lg/extrabold", "heading-lg/bold", "heading-lg/semibold", "heading-lg/medium",
    "heading-md/bold", "heading-md/semibold", "heading-md/medium", "heading-md/normal",
    "heading-sm/bold", "heading-sm/semibold", "heading-sm/medium",
] as const;
export type HeadingVariantType = typeof HeadingVariants[number];

export const CodeColors = [
    "text-code", "text-code-keyword", "text-code-string", "text-code-comment",
    "text-code-builtin", "text-code-variable", "text-code-tag", "text-code-title",
    "text-code-section", "text-code-bullet", "text-code-addition", "text-code-deletion",
] as const;
export type CodeColorType = typeof CodeColors[number];

export const NoticeTypes = ["info", "warn", "danger", "positive", "preview"] as const;
export type NoticeTypeValue = typeof NoticeTypes[number];

export const PresetColors = [
    0x5865F2, 0x3BA55C, 0xFAA61A, 0xED4245, 0xEB459E,
    0x9B59B6, 0x3498DB, 0x1ABC9C, 0xE67E22, 0x2ECC71,
] as const;

export const FontSizeMap: Record<string, string> = {
    xxs: "0.625rem",
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    xxl: "2rem",
};

export const ManaTextButtonTextVariants = [
    "text-xs/normal", "text-sm/normal", "text-sm/medium",
    "text-md/normal", "text-md/medium", "text-lg/medium",
] as const;
export type ManaTextButtonTextVariant = typeof ManaTextButtonTextVariants[number];

export const TimestampDisplayFormats = [
    { format: "LT", description: "Time (e.g., 8:30 PM)" },
    { format: "LTS", description: "Time with seconds (e.g., 8:30:25 PM)" },
    { format: "L", description: "Date (e.g., 09/04/1986)" },
    { format: "LL", description: "Date with month name (e.g., September 4, 1986)" },
    { format: "LLL", description: "Date and time (e.g., September 4, 1986 8:30 PM)" },
    { format: "LLLL", description: "Full date and time (e.g., Thursday, September 4, 1986 8:30 PM)" },
    { format: "l", description: "Short date (e.g., 9/4/1986)" },
    { format: "ll", description: "Short date with month (e.g., Sep 4, 1986)" },
    { format: "lll", description: "Short date and time (e.g., Sep 4, 1986 8:30 PM)" },
    { format: "llll", description: "Short full date and time (e.g., Thu, Sep 4, 1986 8:30 PM)" },
] as const;
export type TimestampDisplayFormat = typeof TimestampDisplayFormats[number]["format"];

export const CheckboxLabelTypes = ["primary", "secondary"] as const;
export type CheckboxLabelType = typeof CheckboxLabelTypes[number];

export const CheckboxUsageVariants = ["single", "indicator"] as const;
export type CheckboxUsageVariant = typeof CheckboxUsageVariants[number];

export const PopoverSizes = ["sm", "md", "lg"] as const;
export type PopoverSize = typeof PopoverSizes[number];

export const SliderOrientations = ["horizontal", "vertical"] as const;
export type SliderOrientation = typeof SliderOrientations[number];

export const ToastType = {
    MESSAGE: "message",
    SUCCESS: "success",
    FAILURE: "failure",
    CUSTOM: "custom",
    CLIP: "clip",
    LINK: "link",
    FORWARD: "forward",
    INVITE: "invite",
    BOOKMARK: "bookmark",
    CLOCK: "clock",
    AI: "ai",
} as const;

export const ToastPosition = {
    TOP: 0,
    BOTTOM: 1,
} as const;
