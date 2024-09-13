/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import $gitHash from "~git-hash";
import $gitRemote from "~git-remote";

// Declarations are not emitted for modules '~git-hash' and '~git-remote'.
export const gitHash: string = $gitHash;
export const gitRemote: string = $gitRemote;

export const VENCORD_USER_AGENT = `Vencord/${gitHash}${gitRemote ? ` (https://github.com/${gitRemote})` : ""}`;
