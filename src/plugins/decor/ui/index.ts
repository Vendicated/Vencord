/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { extractAndLoadChunksLazy, findByPropsLazy } from "@webpack";

export const cl = classNameFactory("vc-decor-");
export const DecorationModalStyles = findByPropsLazy("modalFooterShopButton");

export const requireAvatarDecorationModal = extractAndLoadChunksLazy([".COLLECTIBLES_SHOP_FULLSCREEN&&"]);
export const requireCreateStickerModal = extractAndLoadChunksLazy(["stickerInspected]:"]);
