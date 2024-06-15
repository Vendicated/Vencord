/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { AvatarDecorationData } from "@vencord/discord-types";

import type { Decoration } from "../api";
import { SKU_ID } from "../constants";

export const decorationToAsset = (decoration: Decoration) =>
    `${decoration.animated ? "a_" : ""}${decoration.hash}`;

export const decorationToAvatarDecoration = (decoration: Decoration): AvatarDecorationData =>
    ({ asset: decorationToAsset(decoration), skuId: SKU_ID });
