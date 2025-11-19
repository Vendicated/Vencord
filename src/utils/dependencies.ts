/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type StylusRenderer = require("stylus/lib/renderer");
import type LessStatic from "less";

import { makeLazy } from "./lazy";

// The below code is only used on the Desktop (electron) build of Vencord.
// Browser (extension) builds do not contain these remote imports.

export const shikiWorkerSrc = `https://cdn.jsdelivr.net/npm/@vap/shiki-worker@0.0.8/dist/${IS_DEV ? "index.js" : "index.min.js"}`;
export const shikiOnigasmSrc = "https://cdn.jsdelivr.net/npm/@vap/shiki@0.10.3/dist/onig.wasm";

// @ts-expect-error
export const getStegCloak = /* #__PURE__*/ makeLazy(() => import("https://cdn.jsdelivr.net/npm/stegcloak-dist@1.0.0/index.js"));

export const getStylus = /* #__PURE__*/ makeLazy(async () => {
    const stylusScript = await fetch("https://cdn.jsdelivr.net/npm/stylus-lang-bundle@0.58.1/dist/stylus-renderer.min.js").then(r => r.text());
    // the stylus bundle doesn't have a header that checks for export conditions so we can just patch the script to
    // return the renderer itself
    const patchedScript = stylusScript.replace("var StylusRenderer=", "return ");
    return Function(patchedScript)() as typeof StylusRenderer;
});

export const getLess = /* #__PURE__*/ makeLazy(async () => {
    const lessScript = await fetch("https://cdn.jsdelivr.net/npm/less@4.2.0/dist/less.min.js").then(r => r.text());
    const module = { exports: {} };
    Function("module", "exports", lessScript)(module, module.exports);
    return module.exports as LessStatic;
});
