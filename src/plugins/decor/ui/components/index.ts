/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AvatarDecoration } from "@plugins/decor";
import { findComponentByCodeLazy } from "@webpack";
import type { ComponentType, HTMLProps, PropsWithChildren } from "react";

type DecorationGridItemComponent = ComponentType<PropsWithChildren<HTMLProps<HTMLDivElement>> & {
    onSelect: () => void,
    isSelected: boolean,
}>;

export let DecorationGridItem: DecorationGridItemComponent;
export const setDecorationGridItem = v => DecorationGridItem = v;

export const AvatarDecorationModalPreview = findComponentByCodeLazy("#{intl::PREMIUM_UPSELL_PROFILE_AVATAR_DECO_INLINE_UPSELL_DESCRIPTION}");

type DecorationGridDecorationComponent = React.ComponentType<HTMLProps<HTMLDivElement> & {
    avatarDecoration: AvatarDecoration;
    onSelect: () => void,
    isSelected: boolean,
}>;

export let DecorationGridDecoration: DecorationGridDecorationComponent;
export const setDecorationGridDecoration = v => DecorationGridDecoration = v;
