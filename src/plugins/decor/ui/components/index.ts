/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findComponentByCode, LazyComponentWebpack } from "@webpack";
import { React } from "@webpack/common";
import type { ComponentType, HTMLProps, PropsWithChildren } from "react";

import { AvatarDecoration } from "../..";

type DecorationGridItemComponent = ComponentType<PropsWithChildren<HTMLProps<HTMLDivElement>> & {
    onSelect: () => void,
    isSelected: boolean,
}>;

export let DecorationGridItem: DecorationGridItemComponent;
export const setDecorationGridItem = v => DecorationGridItem = v;

export const AvatarDecorationModalPreview = LazyComponentWebpack(() => {
    const component = findComponentByCode(".shopPreviewBanner");
    return React.memo(component);
});

type DecorationGridDecorationComponent = React.ComponentType<HTMLProps<HTMLDivElement> & {
    avatarDecoration: AvatarDecoration;
    onSelect: () => void,
    isSelected: boolean,
}>;

export let DecorationGridDecoration: DecorationGridDecorationComponent;
export const setDecorationGridDecoration = v => DecorationGridDecoration = v;
