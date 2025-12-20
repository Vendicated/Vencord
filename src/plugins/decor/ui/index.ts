/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { extractAndLoadChunksLazy, findByPropsLazy } from "@webpack";

export const cl = classNameFactory("vc-decor-");
export const DecorationModalStyles = findByPropsLazy("modalPreview", "modalCloseButton", "spinner", "modal");

export const requireAvatarDecorationModal = extractAndLoadChunksLazy(["initialSelectedDecoration:", /initialSelectedDecoration:\i,.{0,300}\i\.e\(/]);
export const requireCreateStickerModal = extractAndLoadChunksLazy(["stickerInspected]:"]);
