/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import extractAndRequireModuleIds from "./extractAndRequireModuleIds";

let openCreateStickerModalLazy;
export const setOpenCreateStickerModalLazy = e => { openCreateStickerModalLazy = e; };

export default async () => extractAndRequireModuleIds(openCreateStickerModalLazy);
