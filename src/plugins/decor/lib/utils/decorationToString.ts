/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Decoration } from "../api";

export default (decoration: Decoration) => `${decoration.animated ? "a_" : ""}${decoration.hash}`;
