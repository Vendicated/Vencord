/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ChipVariant =
    | "blurpleLight" | "blurpleMedium" | "blurpleDark"
    | "purpleLight" | "purpleMedium" | "purpleDark"
    | "greenLight" | "greenMedium" | "greenDark"
    | "orangeLight" | "orangeMedium" | "orangeDark"
    | "yellowLight" | "yellowMedium" | "yellowDark"
    | "pinkLight" | "pinkMedium" | "pinkDark"
    | "redLight" | "redMedium" | "redDark"
    | "grayLight" | "grayMedium" | "grayDark";

export interface ChipProps {
    text: string;
    variant?: ChipVariant;
}
