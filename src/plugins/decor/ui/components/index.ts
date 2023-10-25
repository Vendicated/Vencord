/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy } from "@webpack";

export let DecorationGridItem;
export const setDecorationGridItem = v => DecorationGridItem = v;
export const AvatarDecorationPreview = findByCodeLazy("AvatarDecorationModalPreview");

export let DecorationGridDecoration;
export const setDecorationGridDecoration = v => DecorationGridDecoration = v;
