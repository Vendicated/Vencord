/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { filters, findLazy } from "@webpack";

import extractAndRequireModuleId from "./extractAndRequireModuleId";

const filter = filters.byCode("isDisplayingIndividualStickers");
const StickerPickerPreview = findLazy(m => m.default?.type && filter(m.default.type));

export default async () => extractAndRequireModuleId(StickerPickerPreview.default.type);
