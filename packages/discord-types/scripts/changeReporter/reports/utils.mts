/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CR } from "../types.mts";

/** Ensures config's type matches the type of the declaration found by the parser. */
export function getSanitizedConfig(config: CR.DeclarationConfig, report: CR.ClassReport): CR.ClassConfig;
export function getSanitizedConfig(config: CR.DeclarationConfig, report: CR.EnumReport): CR.EnumConfig;
export function getSanitizedConfig(config: CR.DeclarationConfig, report: CR.DeclarationReport) {
    const { type } = config;
    const expectedType = report.type;
    if (type === expectedType)
        return config;
    report.warns.push(`Expected config type for '${report.identifier}' to be '${expectedType}', but got '${type}'; config values will be ignored.`);
    return { type: expectedType };
}

export function pageFunction(...args: [string, ...string[]]): any {
    const body = args.pop()!;
    return new Function(...args, `"use strict";${body}`);
}

// https://github.com/microsoft/TypeScript/issues/36177
const AsyncFunction: any = async function () {}.constructor;

export function pageAsyncFunction(...args: [string, ...string[]]): any {
    const body = args.pop()!;
    return new AsyncFunction(...args, `"use strict";${body}`);
}

// Based on ECMA-262
const functionDeclarationOrArrowFunctionDefinitionRE = /^(?:async(?:[\t\v\f\uFEFF\p{Zs}]|\/\*.*\*\/)+)?(?:function[(*/\t\n\v\f\r\uFEFF\p{Zs}]|(?:\(|(?:[\p{IDS}$_]|\\u(?:[0-9A-Fa-f]{4}|\{[0-9A-Fa-f]{5}\}))(?:[\p{IDC}$]|\\u(?:[0-9A-Fa-f]{4}|\{[0-9A-Fa-f]{5}\}))+(?:[\t\n\v\f\r\uFEFF\p{Zs}]|\/\*.*\*\/)*=))/u;

/**
 * Makes the result of `func.toString()` a callable expression when evaled.
 * Does not support getters, setters, static methods, private methods/getters/setters,
 * or method definitions with symbol keys.
 */
export function funcToString(func: (...args: never) => unknown) {
    const funcString = func.toString();
    if (functionDeclarationOrArrowFunctionDefinitionRE.test(funcString))
        return `(${funcString})`;
    return `({${funcString}})[${JSON.stringify(func.name)}]`;
}

export function getErrorStack(error: unknown) {
    return typeof error === "object" && error !== null && "stack" in error
        ? error.stack
        : error;
}
