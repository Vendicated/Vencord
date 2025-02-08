/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { wreq } from "@webpack";
import { AnyModuleFactory, AnyWebpackRequire } from "webpack/wreq";

import { SYM_ORIGINAL_FACTORY, SYM_PATCHED_BY, SYM_PATCHED_SOURCE } from "./symbols";

export function getOriginalFactory(id: PropertyKey, webpackRequire = wreq as AnyWebpackRequire) {
    const moduleFactory = webpackRequire.m[id];
    return (moduleFactory?.[SYM_ORIGINAL_FACTORY] ?? moduleFactory) as AnyModuleFactory | undefined;
}

export function getFactoryPatchedSource(id: PropertyKey, webpackRequire = wreq as AnyWebpackRequire) {
    return webpackRequire.m[id]?.[SYM_PATCHED_SOURCE];
}

export function getFactoryPatchedBy(id: PropertyKey, webpackRequire = wreq as AnyWebpackRequire) {
    return webpackRequire.m[id]?.[SYM_PATCHED_BY];
}
