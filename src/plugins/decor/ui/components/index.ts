/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NoopComponent } from "@utils/react";
import { findComponentByCode } from "@webpack";
import { React } from "@webpack/common";

import { AvatarDecoration } from "../..";

type DecorationGridItemComponent = AnyComponentTypeWithChildren<React.ComponentPropsWithoutRef<"div"> & {
    onSelect: () => void,
    isSelected: boolean,
}>;

export let DecorationGridItem: DecorationGridItemComponent = NoopComponent;
export const setDecorationGridItem = v => DecorationGridItem = v;

export const AvatarDecorationModalPreview = findComponentByCode(".shopPreviewBanner", component => React.memo(component));

type DecorationGridDecorationComponent = AnyComponentType<React.ComponentPropsWithoutRef<"div"> & {
    avatarDecoration: AvatarDecoration;
    onSelect: () => void,
    isSelected: boolean,
}>;

export let DecorationGridDecoration: DecorationGridDecorationComponent = NoopComponent;
export const setDecorationGridDecoration = v => DecorationGridDecoration = v;
