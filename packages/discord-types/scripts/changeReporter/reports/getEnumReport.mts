/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/typescript-estree";
import type { Page } from "puppeteer-core";

import type { autoFindEnum } from "../finds/enums.mts";
import { formatValue } from "../logging/utils.mjs";
import type { CR } from "../types.mts";
import { funcToString, getErrorStack, getSanitizedConfig, pageAsyncFunction, pageFunction } from "./utils.mjs";

export async function getEnumReport(
    page: Page,
    declaration: TSESTree.TSEnumDeclaration,
    rawConfig: CR.DeclarationConfig
) {
    const { name } = declaration.id;
    const report: CR.EnumReport = {
        type: "enum",
        identifier: name,
        changes: undefined,
        error: undefined,
        warns: []
    };

    const config = getSanitizedConfig(rawConfig, report);
    const source = getEnumMembers(declaration.body.members, config, report);

    const { find } = config;
    if (find) {
        try {
            const changes = await page.evaluate<[CR.EnumSource], CR.FindFunction<[CR.EnumSource], CR.EnumChanges>>(
                pageAsyncFunction("s", `const o = await ${funcToString(find)}.call(Vencord, s);`
                    + "if (isValidEnum(o)) return getEnumChanges(s, o);"),
                source
            );
            if (changes) {
                checkEnumIgnores(changes, config, report);
                report.changes = changes;
                return report;
            }
            report.warns.push(`Find for enum '${name}' failed; attempting automatic enum find.`);
        } catch (error) {
            report.warns.push(`Find for enum '${name}' errored; attempting automatic enum find:\n` + getErrorStack(error));
        }
    }

    try {
        const changes = await page.evaluate<Parameters<typeof autoFindEnum>, typeof autoFindEnum>(
            pageFunction("s", "return autoFindEnum(s);"),
            source
        );
        if (changes) {
            // Ignore enums that do not have any members in common
            if (changes.unchangedCount > 0) {
                checkEnumIgnores(changes, config, report);
                report.changes = changes;
            } else
                report.error = `Automatic enum find for enum '${name}' failed. The target enum may have too many changes.`;
        } else
            report.error = `Automatic enum find for enum '${name}' failed.`;
    } catch (error) {
        report.error = `Automatic enum find for enum '${name}' errored:\n` + getErrorStack(error);
    }
    return report;
}

function getEnumMembers(
    members: readonly TSESTree.TSEnumMember[],
    config: CR.EnumConfig,
    report: CR.EnumReport
) {
    const source: CR.EnumSource = {};

    for (const [index, member] of members.entries()) {
        if (member.computed) {
            report.warns.push(`Key of member at index '${index}' of enum '${report.identifier}' is computed. Computed enum member keys are unsupported; ignoring member.`);
            continue;
        }
        const { id } = member;
        const key = id.type === AST_NODE_TYPES.Literal ? id.value : id.name;

        const { initializer } = member;
        if (!initializer) {
            report.warns.push(`Member '${key}' of enum '${report.identifier}' has no initializer. Enum members without initializers are unsupported; ignoring member.`);
            continue;
        }

        const { type } = initializer;
        switch (type) {
            case AST_NODE_TYPES.Literal: {
                const { value } = initializer;
                if (typeof value === "string" || typeof value === "number")
                    source[key] = value;
                else
                    report.warns.push(`Literal initializer type '${typeof value}' of member '${key}' of enum '${report.identifier}' is unsupported; ignoring member.`);
                break;
            }
            case AST_NODE_TYPES.BinaryExpression: {
                const { operator } = initializer;
                if (operator !== "<<") {
                    report.warns.push(`BinaryExpression initializer operator '${operator}' of member '${key}' of enum '${report.identifier}' is unsupported; ignoring member.`);
                    continue;
                }

                const { left, right } = initializer;
                if (
                    left.type !== AST_NODE_TYPES.Literal
                    || typeof left.value !== "number"
                    || right.type !== AST_NODE_TYPES.Literal
                    || typeof right.value !== "number"
                ) {
                    report.warns.push(`BinaryExpression initializer of member '${key}' of enum '${report.identifier}' is unsupported; ignoring member.`);
                    continue;
                }

                source[key] = left.value << right.value;

                break;
            }
            default:
                report.warns.push(`Initializer type '${type}' of member '${key}' of enum '${report.identifier}' is unsupported; ignoring member.`);
                break;
        }
    }

    const { keyMapper } = config;
    if (keyMapper)
        for (const key in source) {
            const value = source[key]!;
            delete source[key];
            source[keyMapper(key)] = value;
        }

    const { ignoredAdditions, ignoredRemovals } = config;

    // Add ignored additions so as to not affect similarity score
    if (ignoredAdditions)
        for (const [key, value] of ignoredAdditions)
            source[key] = value;

    // Remove ignored removals so as to not affect similarity score
    if (ignoredRemovals)
        for (const [key, value] of ignoredRemovals)
            if (value === undefined || source[key] === value)
                delete source[key];

    return source;
}

function checkEnumIgnores(
    changes: CR.EnumChanges,
    config: CR.EnumConfig,
    report: CR.EnumReport
) {
    const { additions, removals } = changes;
    const { ignoredAdditions, ignoredRemovals } = config;

    if (ignoredAdditions)
        for (const [key, value] of ignoredAdditions)
            if (removals[key] === value)
                report.warns.push(`Ignored addition '${key} = ${formatValue(value)}' in config for enum '${report.identifier}' had no effect.`);

    if (ignoredRemovals)
        for (const [key, value] of ignoredRemovals)
            if (value === undefined ? key in additions : additions[key] === value)
                report.warns.push(`Ignored removal '${key}${value === undefined ? "" : " = " + formatValue(value)}' in config for enum '${report.identifier}' had no effect.`);
}
