/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Colorway {
    [key: string]: any,
    name: string,
    "dc-import"?: string,
    accent: string,
    primary: string,
    secondary: string,
    tertiary: string,
    original?: boolean,
    author: string,
    authorID: string,
    colors?: string[],
    isGradient?: boolean,
    sourceType?: "online" | "offline" | "temporary" | null,
    source?: string,
    linearGradient?: string,
    preset?: string,
    creatorVersion: string;
}

export interface ColorPickerProps {
    color: number;
    showEyeDropper: boolean;
    suggestedColors: string[];
    label: any;
    onChange(color: number): void;
}

export interface ColorwayObject {
    id: string | null,
    css?: string | null,
    sourceType: "online" | "offline" | "temporary" | null,
    source: string | null | undefined,
    colors: {
        accent?: string | undefined,
        primary?: string | undefined,
        secondary?: string | undefined,
        tertiary?: string | undefined;
    },
    linearGradient?: string;
}

export interface SourceObject {
    type: "online" | "offline" | "temporary",
    source: string,
    colorways: Colorway[];
}

export enum SortOptions {
    NAME_AZ = 1,
    NAME_ZA = 2,
    SOURCE_AZ = 3,
    SOURCE_ZA = 4
}

export interface StoreObject {
    sources: StoreItem[];
}

export interface StoreItem {
    name: string,
    id: string,
    description: string,
    url: string,
    authorGh: string;
}

export interface ModalProps {
    transitionState: 0 | 1 | 2 | 3 | 4;
    onClose(): void;
}
