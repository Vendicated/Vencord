/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { filters, findByPropsLazy, findLazy } from "@webpack";

import extractAndRequireModuleId from "./extractAndRequireModuleId";

const AvatarDecorationModalOpener = findByPropsLazy("openAvatarDecorationModal");

export function requireAvatarDecorationModal() {
    return extractAndRequireModuleId(AvatarDecorationModalOpener.openAvatarDecorationModal);
}

const filter = filters.byCode("isDisplayingIndividualStickers");
const StickerPickerPreview = findLazy(m => m.default?.type && filter(m.default.type));

export function requireCreateStickerModal() {
    return extractAndRequireModuleId(StickerPickerPreview.default.type);

}
