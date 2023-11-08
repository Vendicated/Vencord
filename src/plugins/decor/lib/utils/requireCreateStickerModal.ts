/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findLazy } from "@webpack";

import extractAndRequireModuleId from "./extractAndRequireModuleId";

const StickerPickerPreview = findLazy(m => {
    const type = m.default?.type;
    if (typeof type !== "function") return false;
    const s = Function.prototype.toString.call(type);
    return s.includes("isDisplayingIndividualStickers");
});

export default async () => extractAndRequireModuleId(StickerPickerPreview.default.type);
