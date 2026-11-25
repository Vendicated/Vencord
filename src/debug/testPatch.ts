/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canonicalizeMatch, canonicalizeReplace, wrapFactorySource } from "@utils/patches";
import type { Patch, PatchReplacement } from "@utils/types";
import { search } from "@webpack";

export interface PatchTarget {
    moduleId: string;
    source: string;
}

export function findPatchTarget(find: Patch["find"]) {
    const candidates = search(find);
    const ids = Object.keys(candidates);
    if (ids.length !== 1) {
        return {
            ok: false as const,
            matchCount: ids.length,
            error: "Expected exactly one 'find' matches, found " + ids.length
        };
    }

    const [moduleId] = ids;
    const source = wrapFactorySource(candidates[moduleId].toString().replaceAll("\n", ""));
    return { ok: true as const, target: { moduleId, source } };
}

export function previewPatchReplacement(
    source: string,
    replacement: Pick<PatchReplacement, "match" | "replace">,
    plugin = "PlaceHolderPluginName"
) {
    const { match, replace } = replacement;
    if (!match || (typeof match !== "string" && !(match instanceof RegExp))) {
        throw new Error("Expected a string or RegExp in 'match'");
    }
    if (typeof replace !== "string" && typeof replace !== "function") {
        throw new Error("Expected 'replace' to be a string or function");
    }

    const canonicalMatch = canonicalizeMatch(match);
    const pluginPath = `Vencord.Plugins.plugins[${JSON.stringify(plugin)}]`;
    const canonicalReplace = canonicalizeReplace(replace, pluginPath);
    const patchedSource = source.replace(canonicalMatch, canonicalReplace as string);
    return { canonicalMatch, patchedSource };
}

function checkPatchReplacement(source: string, patchedSource: string) {
    if (source === patchedSource) {
        return "Had no effect";
    }

    try {
        Function(patchedSource);
    } catch (error) {
        return String(error);
    }
}

export function testPatchReplacements(source: string, replacements: PatchReplacement[], plugin?: string) {
    let patchedSource = source;

    for (const [index, replacement] of replacements.entries()) {
        const label = `Replacement ${index + 1} failed: `;
        try {
            const { patchedSource: nextSource } = previewPatchReplacement(patchedSource, replacement, plugin);
            const error = checkPatchReplacement(patchedSource, nextSource);
            if (error) {
                return { ok: false as const, error: label + error };
            }
            patchedSource = nextSource;
        } catch (error) {
            return { ok: false as const, error: label + error };
        }
    }

    return { ok: true as const, patchedSource };
}

export function testPatch({ find, replacement, plugin }: Pick<Patch, "find" | "replacement"> & Partial<Pick<Patch, "plugin">>) {
    if (!find || (typeof find !== "string" && !(find instanceof RegExp))) {
        return { ok: false as const, error: "Expected a string or RegExp in 'find'" };
    }

    const replacements = Array.isArray(replacement) ? replacement : [replacement];
    if (!replacement || replacements.length === 0) {
        return { ok: false as const, error: "No replacements to test" };
    }

    const result = findPatchTarget(find);
    if (!result.ok) {
        return { ok: false as const, error: result.error };
    }

    const { moduleId, source } = result.target;
    const check = testPatchReplacements(source, replacements, plugin);
    return check.ok ? { ...check, moduleId } : check;
}
