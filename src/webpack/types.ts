/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AnyModuleFactory } from "@vencord/discord-types/webpack";

import { SYM_ORIGINAL_FACTORY, SYM_PATCHED_BY, SYM_PATCHED_SOURCE } from "./patchWebpack";

export interface AnyVencordModuleFactory extends AnyModuleFactory {
    [SYM_PATCHED_SOURCE]?: string;
    [SYM_PATCHED_BY]?: Set<string>;
}

export interface PatchedModuleFactory extends AnyVencordModuleFactory {
    [SYM_ORIGINAL_FACTORY]: AnyModuleFactory;
    [SYM_PATCHED_SOURCE]?: string;
    [SYM_PATCHED_BY]?: Set<string>;
}

export type MaybePatchedModuleFactory = PatchedModuleFactory | AnyVencordModuleFactory;
