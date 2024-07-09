/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFile } from "fs/promises";
import { basename, join } from "path";

import { AST_NODE_TYPES, parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import type { Page } from "puppeteer-core";
import { satisfies, subset, valid, validRange } from "semver";
import type { JsonObject, JsonValue } from "type-fest";

import { config } from "./config.mjs";
import type { autoFindClass, autoFindEnum, autoFindStore } from "./finds.mts";
import type { CR } from "./types.mts";

export async function getChangeReport(page: Page): Promise<CR.ChangeReport> {
    const { rootDir, deps, src } = config;

    const depsReports: Promise<CR.DependenciesReport>[] = [];
    if (deps)
        for (const filePath in deps)
            depsReports.push(getDependenciesReport(page, join(rootDir, filePath), deps[filePath]!));

    const srcReports: Promise<CR.SrcFileReport>[] = [];
    if (src)
        for (const filePath in src)
            srcReports.push(getSrcFileReport(page, join(rootDir, filePath), src[filePath]!));

    return {
        deps: await Promise.all(depsReports),
        src: await Promise.all(srcReports)
    };
}

async function getDependenciesReport(page: Page, filePath: string, config: CR.DependenciesConfig) {
    const fileName = basename(filePath);
    const fileReport: CR.DependenciesReport = {
        filePath,
        fileName,
        fileWarns: [],
        passed: [],
        warned: [],
        failed: [],
        errored: []
    };

    let dependencies: JsonValue | undefined;
    try {
        ({ dependencies } = JSON.parse(await readFile(filePath, "utf-8")));
    } catch (error) {
        fileReport.fileError = `Failed to read and parse file '${fileName}':\n` + error;
        return fileReport;
    }

    if (
        typeof dependencies !== "object"
        || dependencies === null
        || Array.isArray(dependencies)
    ) {
        fileReport.fileError = `File '${fileName}' does not have a valid dependencies object.`;
        return fileReport;
    }

    for (const key in config) {
        const dependencyConfig = config[key]!;

        const report: CR.DependencyReport = {
            name: key,
            packageVersionRange: undefined,
            discordVersion: undefined,
            expectedVersionRange: undefined,
            error: undefined,
            warns: []
        };

        // https://github.com/microsoft/TypeScript/issues/53395
        const packageVersionRange = (dependencies as JsonObject)[key];
        if (typeof packageVersionRange !== "string") {
            report.error = `File '${fileName}' does not have a dependency with name '${key}'.`;
            fileReport.errored.push(report);
            continue;
        }
        report.packageVersionRange = packageVersionRange;

        if (!validRange(packageVersionRange)) {
            report.error = `Version range '${packageVersionRange}' for dependency '${key}' in file '${fileName}' is invalid.`;
            fileReport.errored.push(report);
            continue;
        }

        let discordVersion: unknown;
        try {
            discordVersion = await page.evaluate<[], CR.FindFunction<[]>>(
                pageFunction(`return ${funcToString(dependencyConfig.find)}.call(Vencord);`)
            );
        } catch (error) {
            report.error = `Find for version of dependency '${key}' errored:\n` + getErrorStack(error);
            fileReport.errored.push(report);
            continue;
        }

        if (typeof discordVersion !== "string") {
            report.error = `Find for version of dependency '${key}' failed.`;
            fileReport.errored.push(report);
            continue;
        }
        report.discordVersion = discordVersion;

        if (!valid(discordVersion)) {
            report.error = `Find for version of dependency '${key}' returned an invalid SemVer version ('${discordVersion}').`;
            fileReport.errored.push(report);
            continue;
        }

        const { overrides } = dependencyConfig;
        const expectedVersionRange = overrides?.find(([range]) => satisfies(discordVersion, range))?.[1]
            ?? discordVersion;
        report.expectedVersionRange = expectedVersionRange;

        if (subset(packageVersionRange, expectedVersionRange)) {
            if (report.warns.length > 0)
                fileReport.warned.push(report);
            else
                fileReport.passed.push(report);
        } else
            fileReport.failed.push(report);
    }

    return fileReport;
}

async function getSrcFileReport(page: Page, filePath: string, config: CR.SrcFileConfig) {
    const fileName = basename(filePath);
    const fileReport: CR.SrcFileReport = {
        filePath,
        fileName,
        fileWarns: [],
        unchanged: [],
        warned: [],
        changed: [],
        errored: []
    };

    let ast: TSESTree.Program;
    try {
        ast = parse(await readFile(filePath, "utf-8"));
    } catch (error) {
        fileReport.fileError = `Failed to read and parse '${fileName}':\n` + error;
        return fileReport;
    }

    const unfoundDeclarations = new Set(Object.keys(config));
    const reports: Promise<CR.DeclarationReport>[] = [];
    for (const node of ast.body) {
        const declaration = node.type === AST_NODE_TYPES.ExportNamedDeclaration
            ? node.declaration
            : node;
        if (!declaration) continue;

        switch (declaration.type) {
            case AST_NODE_TYPES.ClassDeclaration: {
                const { id } = declaration;
                if (!id) continue;

                const { name } = id;
                const declarationConfig = config[name];
                if (!declarationConfig) continue;

                unfoundDeclarations.delete(name);
                reports.push(getClassReport(
                    page,
                    // @ts-expect-error: Control flow narrowing bug
                    declaration,
                    declarationConfig
                ));
                break;
            }
            case AST_NODE_TYPES.TSEnumDeclaration: {
                const { name } = declaration.id;
                const declarationConfig = config[name];
                if (!declarationConfig) continue;

                unfoundDeclarations.delete(name);
                reports.push(getEnumReport(
                    page,
                    declaration,
                    declarationConfig
                ));
                break;
            }
        }
    }

    for (const report of await Promise.all(reports)) {
        if (report.error !== undefined) {
            fileReport.errored.push(report);
        } else {
            const { changes } = report;
            if (changes!.changedCount > 0)
                fileReport.changed.push(report);
            else if (report.warns.length > 0)
                fileReport.warned.push(report);
            else
                fileReport.unchanged.push(report);
        }
    }

    for (const identifier of unfoundDeclarations)
        fileReport.errored.push({
            type: config[identifier]!.type,
            identifier,
            changes: undefined,
            error: `File '${fileName}' does not have a declaration with identifier '${identifier}'.`,
            warns: []
        });

    return fileReport;
}

/** Ensures config's type matches the type of the declaration found by the parser. */
function getSanitizedConfig<Report extends CR.DeclarationReport>(
    config: CR.DeclarationConfig,
    report: Report
): { class: CR.ClassConfig; enum: CR.EnumConfig; }[Report["type"]] {
    const { type } = config;
    const expectedType = report.type;
    if (type === expectedType)
        // @ts-expect-error: Bug
        return config;
    report.warns.push(`Expected config type for '${report.identifier}' to be '${expectedType}', but got '${type}'; config values will be ignored.`);
    // @ts-expect-error: Bug
    return { type: expectedType };
}

async function getClassReport(
    page: Page,
    declaration: TSESTree.ClassDeclarationWithName,
    rawConfig: CR.DeclarationConfig
) {
    const { name } = declaration.id;
    const report: CR.ClassReport = {
        type: "class",
        identifier: name,
        changes: undefined,
        error: undefined,
        warns: []
    };

    const config = getSanitizedConfig(rawConfig, report);
    const source = getClassMembers(declaration.body.body, config, report);

    const { find } = config;
    if (find) {
        try {
            const changes = await page.evaluate<[CR.ClassMembers], CR.FindFunction<[CR.ClassMembers], CR.ClassChanges>>(
                pageAsyncFunction("s", `const c = await ${funcToString(find)}.call(Vencord, s);`
                    + "if (Array.isArray(c) ? c.length > 0 && c.every(isValidClass) : isValidClass(c))"
                    + "return getClassChanges(c, s);"),
                source
            );
            if (changes) {
                checkClassIgnores(changes, config, report);
                report.changes = changes;
                return report;
            }
            report.warns.push(`Find for class '${name}' failed; attempting automatic class find.`);
        } catch (error) {
            report.warns.push(`Find for class '${name}' errored; attempting automatic class find:\n` + getErrorStack(error));
        }
    }

    // Fast path for stores
    if (/Store$/.test(name) && !declaration.abstract) {
        try {
            const changes = await page.evaluate<Parameters<typeof autoFindStore>, typeof autoFindStore>(
                pageFunction("n", "s", "return autoFindStore(n, s);"),
                name,
                source
            );
            if (changes) {
                checkClassIgnores(changes, config, report);
                report.changes = changes;
                return report;
            }
            report.warns.push(`Automatic store find for store '${name}' failed; attempting automatic class find.`);
        } catch (error) {
            report.warns.push(`Automatic store find for store '${name}' errored; attempting automatic class find:\n` + getErrorStack(error));
        }
    }

    try {
        const changes = await page.evaluate<Parameters<typeof autoFindClass>, typeof autoFindClass>(
            pageFunction("s", "return autoFindClass(s);"),
            source
        );
        if (changes) {
            if (
                // Ignore classes that do not have any members in common
                // or classes that only have a constructor in common
                changes.unchangedCount > 1
                || changes.unchangedCount > 0
                && (changes.additions.constructorDefinition
                    || changes.removals.constructorDefinition)
            ) {
                checkClassIgnores(changes, config, report);
                report.changes = changes;
            } else
                report.error = `Automatic class find for class '${name}' failed. The target class may have too many additions.`;
        } else
            report.error = `Automatic class find for class '${name}' failed.`;
    } catch (error) {
        report.error = `Automatic class find for class '${name}' errored:\n` + getErrorStack(error);
    }
    return report;
}

function checkClassIgnores(
    changes: CR.ClassChanges,
    config: CR.ClassConfig,
    report: CR.ClassReport
) {
    const { additions, removals } = changes;
    const { ignoredAdditions, ignoredRemovals } = config;

    if (ignoredAdditions) {
        const { constructorDefinition, ...rest } = ignoredAdditions;

        if (constructorDefinition && removals.constructorDefinition)
            report.warns.push(`Ignored addition 'constructorDefinition' in config for class '${report.identifier}' had no effect.`);

        for (const key in rest) {
            const memberCategory = key as keyof typeof rest;
            const removedKeys = new Set(removals[memberCategory]);
            for (const ignoredKey in rest[memberCategory])
                if (removedKeys.has(ignoredKey))
                    report.warns.push(`Ignored addition '${ignoredKey}' of '${memberCategory}' in config for class '${report.identifier}' had no effect.`);
        }
    }

    if (ignoredRemovals) {
        const { constructorDefinition, ...rest } = ignoredRemovals;

        if (constructorDefinition && additions.constructorDefinition)
            report.warns.push(`Ignored removal 'constructorDefinition' in config for class '${report.identifier}' had no effect.`);

        for (const key in rest) {
            const memberCategory = key as keyof typeof rest;
            const ignoredKeys = rest[memberCategory];
            if (Array.isArray(ignoredKeys)) {
                const addedKeys = new Set(additions[memberCategory]);
                for (const ignoredKey in ignoredKeys)
                    if (addedKeys.has(ignoredKey))
                        report.warns.push(`Ignored removal '${ignoredKey}' of '${memberCategory}' in config for class '${report.identifier}' had no effect.`);
            } else if (ignoredKeys && additions[memberCategory].length > 0)
                report.warns.push(`Ignored removal for members of category '${memberCategory}' in config for class '${report.identifier}' had no effect.`);
        }
    }
}

function getClassMembers(
    members: TSESTree.ClassElement[],
    config: CR.ClassConfig,
    report: CR.ClassReport
): CR.ClassMembers {
    let constructorDefinition = false;
    // Ignore duplicate members from overload signatures and config ignores
    const staticMethodsAndFields = new Set<string>();
    const staticGetters = new Set<string>();
    const staticSetters = new Set<string>();
    const methods = new Set<string>();
    const getters = new Set<string>();
    const setters = new Set<string>();
    const fields = new Set<string>();

    const { includeOptional } = config;
    for (const [index, member] of members.entries()) {
        switch (member.type) {
            // Exclude abstract methods
            case AST_NODE_TYPES.MethodDefinition: {
                if (member.optional && !includeOptional) continue;

                const name = getClassMemberName(member, index, report);
                if (name === undefined) continue;

                switch (member.kind) {
                    case "constructor":
                        // Ignore constructor definitions without parameters
                        if (member.value.params.length > 0)
                            constructorDefinition = true;
                        break;
                    case "method":
                        if (member.static)
                            staticMethodsAndFields.add(name);
                        else
                            methods.add(name);
                        break;
                    case "get":
                        if (member.static)
                            staticGetters.add(name);
                        else
                            getters.add(name);
                        break;
                    case "set":
                        if (member.static)
                            staticSetters.add(name);
                        else
                            setters.add(name);
                        break;
                }

                break;
            }
            // Exclude abstract properties
            case AST_NODE_TYPES.PropertyDefinition: {
                if (member.optional && !includeOptional) continue;

                const name = getClassMemberName(member, index, report);
                if (name === undefined) continue;

                if (member.static)
                    staticMethodsAndFields.add(name);
                else
                    fields.add(name);

                break;
            }
        }
    }

    const { ignoredAdditions, ignoredRemovals } = config;

    // Add ignored additions so as to not affect `changedCount`
    if (ignoredAdditions) {
        if (ignoredAdditions.constructorDefinition)
            constructorDefinition = true;

        if (ignoredAdditions.staticMethodsAndFields)
            for (const key of ignoredAdditions.staticMethodsAndFields)
                staticMethodsAndFields.add(key);

        if (ignoredAdditions.staticGetters)
            for (const key of ignoredAdditions.staticGetters)
                staticGetters.add(key);

        if (ignoredAdditions.staticSetters)
            for (const key of ignoredAdditions.staticSetters)
                staticSetters.add(key);

        if (ignoredAdditions.methods)
            for (const key of ignoredAdditions.methods)
                methods.add(key);

        if (ignoredAdditions.getters)
            for (const key of ignoredAdditions.getters)
                getters.add(key);

        if (ignoredAdditions.setters)
            for (const key of ignoredAdditions.setters)
                setters.add(key);

        if (ignoredAdditions.fields)
            for (const key of ignoredAdditions.fields)
                fields.add(key);
    }

    // Remove ignored removals so as to not affect `changedCount`
    if (ignoredRemovals) {
        if (ignoredRemovals.constructorDefinition)
            constructorDefinition = false;

        if (Array.isArray(ignoredRemovals.staticMethodsAndFields)) {
            for (const key of ignoredRemovals.staticMethodsAndFields)
                staticMethodsAndFields.delete(key);
        } else if (ignoredRemovals.staticMethodsAndFields)
            staticMethodsAndFields.clear();

        if (Array.isArray(ignoredRemovals.staticGetters)) {
            for (const key of ignoredRemovals.staticGetters)
                staticGetters.delete(key);
        } else if (ignoredRemovals.staticGetters)
            staticGetters.clear();

        if (Array.isArray(ignoredRemovals.staticSetters)) {
            for (const key of ignoredRemovals.staticSetters)
                staticSetters.delete(key);
        } else if (ignoredRemovals.staticSetters)
            staticSetters.clear();

        if (Array.isArray(ignoredRemovals.methods)) {
            for (const key of ignoredRemovals.methods)
                methods.delete(key);
        } else if (ignoredRemovals.methods)
            methods.clear();

        if (Array.isArray(ignoredRemovals.getters)) {
            for (const key of ignoredRemovals.getters)
                getters.delete(key);
        } else if (ignoredRemovals.getters)
            getters.clear();

        if (Array.isArray(ignoredRemovals.setters)) {
            for (const key of ignoredRemovals.setters)
                setters.delete(key);
        } else if (ignoredRemovals.setters)
            setters.clear();

        if (Array.isArray(ignoredRemovals.fields)) {
            for (const key of ignoredRemovals.fields)
                fields.delete(key);
        } else if (ignoredRemovals.fields)
            fields.clear();
    }

    return {
        constructorDefinition: constructorDefinition,
        staticMethodsAndFields: [...staticMethodsAndFields],
        staticGetters: [...staticGetters],
        staticSetters: [...staticSetters],
        methods: [...methods],
        getters: [...getters],
        setters: [...setters],
        fields: [...fields]
    };
}

function getClassMemberName(
    member: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
    index: number,
    report: CR.ClassReport
) {
    const { key } = member;
    switch (key.type) {
        case AST_NODE_TYPES.Identifier: {
            const { name } = key;
            if (!member.computed)
                return name;
            report.warns.push(`Computed key '[${name}]' of member at index '${index}' of class '${report.identifier}' is unsupported; ignoring member.`);
            return;
        }
        case AST_NODE_TYPES.Literal:
            return String(key.value);
        case AST_NODE_TYPES.MemberExpression: {
            const { object, property } = key;
            if (
                object.type === AST_NODE_TYPES.Identifier
                && property.type === AST_NODE_TYPES.Identifier
            ) return `Symbol(${object.name}.${property.name})`;
            break;
        }
    }
    report.warns.push(`Computed key of member at index '${index}' of class '${report.identifier}' is unsupported; ignoring member.`);
}

async function getEnumReport(
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
                    + "if (isValidEnum(o)) return getEnumChanges(o);"),
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
            pageFunction("o", "return autoFindEnum(o);"),
            source
        );
        if (changes) {
            // Ignore enums that do not have any members in common
            if (changes.unchangedCount > 0) {
                checkEnumIgnores(changes, config, report);
                report.changes = changes;
            } else
                report.error = `Automatic enum find for enum '${name}' failed. The target enum may have too many additions.`;
        } else
            report.error = `Automatic enum find for enum '${name}' failed.`;
    } catch (error) {
        report.error = `Automatic enum find for enum '${name}' errored:\n` + getErrorStack(error);
    }
    return report;
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
                report.warns.push(`Ignored addition '${key} = ${JSON.stringify(value)}' in config for enum '${report.identifier}' had no effect.`);

    if (ignoredRemovals)
        for (const [key, value] of ignoredRemovals)
            if (value === undefined ? key in additions : additions[key] === value)
                report.warns.push(`Ignored removal '${key}${value === undefined ? "" : " = " + JSON.stringify(value)}' in config for enum '${report.identifier}' had no effect.`);

    return changes;
}

function getEnumMembers(
    members: TSESTree.TSEnumMember[],
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

function pageFunction(...args: [string, ...string[]]): any {
    const body = args.pop()!;
    return new Function(...args, `"use strict";${body}`);
}

const AsyncFunction: any = async function () {}.constructor;

function pageAsyncFunction(...args: [string, ...string[]]): any {
    const body = args.pop()!;
    return new AsyncFunction(...args, `"use strict";${body}`);
}

// Based on ECMA-262
const functionDeclarationOrArrowFunctionDefinitionRE = /^(?:async(?:[\t\v\f\uFEFF\p{Zs}]|\/\*.*\*\/)+)?(?:function[(*/\t\n\v\f\r\uFEFF\p{Zs}]|(?:\(|(?:[\p{IDS}$_]|\\u(?:[0-9A-Fa-f]{4}|\{[0-9A-Fa-f]{5}\}))(?:[\p{IDC}$]|\\u(?:[0-9A-Fa-f]{4}|\{[0-9A-Fa-f]{5}\}))+(?:[\t\n\v\f\r\uFEFF\p{Zs}]|\/\*.*\*\/)*=))/u;

/**
 * Makes the result of `func.toString()` a callable expression when evaled.
 * Does not support accessors, static methods, private methods/accessors,
 * or method definitions with symbol keys.
 */
function funcToString(func: (...args: never[]) => unknown) {
    const funcString = func.toString();
    if (functionDeclarationOrArrowFunctionDefinitionRE.test(funcString))
        return `(${funcString})`;
    return `({${funcString}})[${JSON.stringify(func.name)}]`;
}

function getErrorStack(error: unknown) {
    return typeof error === "object" && error !== null && "stack" in error
        ? error.stack
        : error;
}
