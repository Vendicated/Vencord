/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/typescript-estree";
import type { Page } from "puppeteer-core";

import type { autoFindClass, autoFindStore } from "../finds/classes.mts";
import type { CR } from "../types.mts";
import { funcToString, getErrorStack, getSanitizedConfig, pageAsyncFunction, pageFunction } from "./utils.mjs";

export async function getClassReport(
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
                    + "if (Array.isArray(c)) { if (c.length > 0 && c.every(isValidClass)) return getClassChanges(s, c); }"
                    + "else if (isValidClass(c)) return getClassChanges(s, [c]);"),
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
                pageFunction("s", "n", "return autoFindStore(s, n);"),
                source,
                name
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
                report.error = `Automatic class find for class '${name}' failed. The target class may have too many changes.`;
        } else
            report.error = `Automatic class find for class '${name}' failed.`;
    } catch (error) {
        report.error = `Automatic class find for class '${name}' errored:\n` + getErrorStack(error);
    }
    return report;
}

function getClassMembers(
    members: readonly TSESTree.ClassElement[],
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

    if (ignoredAdditions) {
        if (ignoredAdditions.constructorDefinition)
            constructorDefinition = true;
        applyClassIgnoredAdditions(staticMethodsAndFields, ignoredAdditions.staticMethodsAndFields);
        applyClassIgnoredAdditions(staticGetters, ignoredAdditions.staticGetters);
        applyClassIgnoredAdditions(staticSetters, ignoredAdditions.staticSetters);
        applyClassIgnoredAdditions(methods, ignoredAdditions.methods);
        applyClassIgnoredAdditions(getters, ignoredAdditions.getters);
        applyClassIgnoredAdditions(setters, ignoredAdditions.setters);
        applyClassIgnoredAdditions(fields, ignoredAdditions.fields);
    }

    if (ignoredRemovals) {
        if (ignoredRemovals.constructorDefinition)
            constructorDefinition = false;
        applyClassIgnoredRemovals(staticMethodsAndFields, ignoredRemovals.staticMethodsAndFields);
        applyClassIgnoredRemovals(staticGetters, ignoredRemovals.staticGetters);
        applyClassIgnoredRemovals(staticSetters, ignoredRemovals.staticSetters);
        applyClassIgnoredRemovals(methods, ignoredRemovals.methods);
        applyClassIgnoredRemovals(getters, ignoredRemovals.getters);
        applyClassIgnoredRemovals(setters, ignoredRemovals.setters);
        applyClassIgnoredRemovals(fields, ignoredRemovals.fields);
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

/** Adds ignored additions so as to not affect `changedCount`. */
function applyClassIgnoredAdditions(members: Set<string>, ignored?: readonly string[]) {
    if (ignored)
        for (const key of ignored)
            members.add(key);
}

/** Removes ignored removals so as to not affect `changedCount`. */
function applyClassIgnoredRemovals(members: Set<string>, ignored?: readonly string[] | boolean) {
    if (Array.isArray(ignored)) {
        for (const key of ignored)
            members.delete(key);
    } else if (ignored)
        members.clear();
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
