/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AvatarDecoration } from "@plugins/decor";
import type { ComponentType, HTMLProps, PropsWithChildren } from "react";

type DecorationGridItemComponent = ComponentType<PropsWithChildren<HTMLProps<HTMLDivElement>> & {
    onSelect: () => void,
    isSelected: boolean,
}>;

export let DecorationGridItem: DecorationGridItemComponent;
export const setDecorationGridItem = v => DecorationGridItem = v;

export let AvatarDecorationModalPreview: ComponentType<any> = () => null;
export const setAvatarDecorationModalPreview = v => AvatarDecorationModalPreview = v;

type DecorationGridDecorationComponent = React.ComponentType<HTMLProps<HTMLDivElement> & {
    avatarDecoration: AvatarDecoration;
    onSelect: () => void,
    isSelected: boolean,
}>;

export let DecorationGridDecoration: DecorationGridDecorationComponent;
export const setDecorationGridDecoration = v => DecorationGridDecoration = v;
