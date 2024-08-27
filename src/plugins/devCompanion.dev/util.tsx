/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canonicalizeMatch } from "@utils/patches";
import { CodeFilter, stringMatches, wreq } from "@webpack";

import { settings } from ".";

type Node = StringNode | RegexNode | FunctionNode;

export interface StringNode {
    type: "string";
    value: string;
}
export interface RegexNode {
    type: "regex";
    value: {
        pattern: string;
        flags: string;
    };
}
export enum FindType {
    STRING,
    REGEX
}
export interface FunctionNode {
    type: "function";
    value: string;
}
export interface PatchData {
    find: string;
    replacement: {
        match: StringNode | RegexNode;
        replace: StringNode | FunctionNode;
    }[];
}
export interface FindData {
    type: string;
    args: Array<StringNode | FunctionNode>;
}export interface SendData {
    type: string;
    data: any;
    ok: boolean;
    nonce?: number;
}
/**
 * extracts the patched module, if there is no patched module, throws an error
 * @param id module id
 */
export function extractOrThrow(id) {
    const module = wreq.m[id];
    if (!module?.$$vencordPatchedSource)
        throw new Error("No patched module found for module id " + id);
    return module.$$vencordPatchedSource;
}
/**
 *  attempts to extract the module, throws if not found
 *
 *
 * if patched is true and no patched module is found fallsback to the non-patched module
 * @param id module id
 * @param patched return the patched module
 */
export function extractModule(id: number, patched = settings.store.usePatchedModule): string {
    const module = wreq.m[id];
    if (!module)
        throw new Error("No module found for module id:" + id);
    return patched ? module.$$vencordPatchedSource ?? module.original.toString() : module.original.toString();
}
export function parseNode(node: Node) {
    switch (node.type) {
        case "string":
            return node.value;
        case "regex":
            return new RegExp(node.value.pattern, node.value.flags);
        case "function":
            // We LOVE remote code execution
            // Safety: This comes from localhost only, which actually means we have less permissions than the source,
            // since we're running in the browser sandbox, whereas the sender has host access
            return (0, eval)(node.value);
        default:
            throw new Error("Unknown Node Type " + (node as any).type);
    }
}
// we need to have our own because the one in webpack returns the first with no handling of more than one module
export function findModuleId(find: CodeFilter) {
    const matches: string[] = [];
    for (const id in wreq.m) {
        if (stringMatches(wreq.m[id].toString(), find)) matches.push(id);
    }
    if (matches.length === 0) {
        throw new Error("No Matches Found");
    }
    if (matches.length !== 1) {
        throw new Error(`This filter matches ${matches.length} modules. Make it more specific!`);
    }
    return matches[0];
}
export function mkRegexFind(idOrSearch: string): RegExp[] {
    const regex = idOrSearch.substring(1, idOrSearch.lastIndexOf("/"));
    const flags = idOrSearch.substring(idOrSearch.lastIndexOf("/") + 1);
    return [canonicalizeMatch(RegExp(regex, flags))];
}

