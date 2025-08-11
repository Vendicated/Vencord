/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated, Nuckyz and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Module, ModuleExports, WebpackRequire } from "@vencord/discord-types/webpack";

import { SYM_ORIGINAL_FACTORY, SYM_PATCHED_BY, SYM_PATCHED_SOURCE } from "./patchWebpack";

export type AnyWebpackRequire = ((moduleId: PropertyKey) => ModuleExports) & Partial<Omit<WebpackRequire, "m">> & {
    /** The module factories, where all modules that have been loaded are stored (pre-loaded or loaded by lazy chunks) */
    m: Record<PropertyKey, AnyModuleFactory>;
};

/** exports can be anything, however initially it is always an empty object */
export type AnyModuleFactory = ((this: ModuleExports, module: Module, exports: ModuleExports, require: AnyWebpackRequire) => void) & {
    [SYM_PATCHED_SOURCE]?: string;
    [SYM_PATCHED_BY]?: Set<string>;
};

export type PatchedModuleFactory = AnyModuleFactory & {
    [SYM_ORIGINAL_FACTORY]: AnyModuleFactory;
    [SYM_PATCHED_SOURCE]?: string;
    [SYM_PATCHED_BY]?: Set<string>;
};

export type MaybePatchedModuleFactory = PatchedModuleFactory | AnyModuleFactory;
