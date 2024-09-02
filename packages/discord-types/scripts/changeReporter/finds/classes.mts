/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// eslint-disable-next-line import/no-relative-packages
import type * as Vencord from "../../../../../src/Vencord.ts";
import type { CR } from "../types.mts";

export function autoFindStore(this: typeof Vencord, source: CR.ClassMembers, name: string) {
    const persistKeyRE = new RegExp(`^${name}(?:V\\d+)?$`);

    const store: { constructor: CR.Class; } | undefined = this.Webpack.find(exp => {
        // Find stores from exported instances
        const { constructor } = exp;
        return typeof constructor === "function" && (
            constructor.displayName === name
            || persistKeyRE.test(constructor.persistKey)
        );
    });

    if (store)
        return getClassChanges(source, [store.constructor]);
}

export function autoFindClass(this: typeof Vencord, source: CR.ClassMembers) {
    let bestMatch: CR.ClassChanges | undefined;
    let lowestChangedCount = Infinity;

    const checked = new WeakSet<CR.Class>();
    this.Webpack.find(exps => {
        for (const name in exps) {
            let constructor: CR.Class;
            // Some getters throw errors
            try {
                // Find classes from exported constructors
                if (isValidClass(exps[name]))
                    constructor = exps[name];
                // Find classes from exported instances
                else if (isValidClass(exps[name]?.constructor))
                    ({ constructor } = exps[name]);
                else
                    continue;
            } catch {
                continue;
            }

            if (!checked.has(constructor)) {
                checked.add(constructor);

                const changes = getClassChanges(source, [constructor]);
                const { changedCount } = changes;
                if (changedCount < lowestChangedCount) {
                    lowestChangedCount = changedCount;
                    bestMatch = changes;
                }
            }
        }

        return false;
    }, { isIndirect: true });

    return bestMatch;
}

export function isValidClass(value: unknown): value is CR.Class {
    if (typeof value !== "function")
        return false;
    const { prototype } = value;
    return typeof prototype === "object" && prototype !== null;
}

export function getClassChanges(
    source: CR.ClassMembers,
    constructors: readonly [CR.Class, ...CR.Class[]] | readonly [...CR.Class[], CR.Class]
): CR.ClassChanges {
    let hasConstructorDefinition = false;
    const constructorDescriptors = new Map<PropertyKey, PropertyDescriptor>();
    const prototypeDescriptors = new Map<PropertyKey, PropertyDescriptor>();
    const matchedFields = new Set<string>();

    // Ignore constructor definitions without parameters
    const constructorRE = /[{}]constructor\([^)]/;
    const fieldRE = /(?<=[{}]constructor\(.+?{.+\(this,")[^"]+(?=",)/g;
    for (const constructor of constructors) {
        const constructorString = constructor.toString();

        if (constructorRE.test(constructorString))
            hasConstructorDefinition = true;

        const constDescriptors = Object.getOwnPropertyDescriptors(constructor);
        for (const key of Object.getOwnPropertyNames(constructor))
            constructorDescriptors.set(key, constDescriptors[key]!);
        for (const key of Object.getOwnPropertySymbols(constructor))
            constructorDescriptors.set(key, constDescriptors[key]!);

        const { prototype } = constructor;
        const protoDescriptors = Object.getOwnPropertyDescriptors(prototype);
        for (const key of Object.getOwnPropertyNames(prototype))
            prototypeDescriptors.set(key, protoDescriptors[key]!);
        for (const key of Object.getOwnPropertySymbols(prototype))
            prototypeDescriptors.set(key, protoDescriptors[key]!);

        for (const [field] of constructorString.matchAll(fieldRE))
            matchedFields.add(field);
    }

    const additions: CR.ClassMembers = {
        constructorDefinition: false,
        staticMethodsAndFields: [],
        staticGetters: [],
        staticSetters: [],
        methods: [],
        getters: [],
        setters: [],
        fields: []
    };
    let unchangedCount = 0;
    let changedCount = 0;

    // Constructor definition with parameters removal
    let constructorDefinition = false;

    if (hasConstructorDefinition) {
        if (source.constructorDefinition) {
            unchangedCount++;
        } else {
            additions.constructorDefinition = true;
            changedCount++;
        }
    } else if (source.constructorDefinition) {
        constructorDefinition = true;
        changedCount++;
    } else {
        unchangedCount++;
    }

    // Static member removals
    const staticMethodsAndFields = new Set(source.staticMethodsAndFields);
    const staticGetters = new Set(source.staticGetters);
    const staticSetters = new Set(source.staticSetters);

    const ignoredConstructorKeys = new Set<PropertyKey>(["length", "name", "prototype"]);
    for (const [rawKey, descriptor] of constructorDescriptors) {
        if (ignoredConstructorKeys.has(rawKey)) continue;

        const key = rawKey.toString();

        if (descriptor.get) {
            if (staticGetters.has(key)) {
                staticGetters.delete(key);
                unchangedCount++;
            } else {
                additions.staticGetters.push(key);
                changedCount++;
            }

            if (descriptor.set) {
                if (staticSetters.has(key)) {
                    staticSetters.delete(key);
                    unchangedCount++;
                } else {
                    additions.staticSetters.push(key);
                    changedCount++;
                }
            }

            continue;
        }

        if (descriptor.set) {
            if (staticSetters.has(key)) {
                staticSetters.delete(key);
                unchangedCount++;
            } else {
                additions.staticSetters.push(key);
                changedCount++;
            }
            continue;
        }

        if (staticMethodsAndFields.has(key)) {
            staticMethodsAndFields.delete(key);
            unchangedCount++;
        } else {
            additions.staticMethodsAndFields.push(key);
            changedCount++;
        }
    }

    changedCount += staticMethodsAndFields.size + staticGetters.size + staticSetters.size;

    // Instance method and getter/setter removals
    const methods = new Set(source.methods);
    const getters = new Set(source.getters);
    const setters = new Set(source.setters);

    const ignoredPrototypeKeys = new Set<PropertyKey>(["constructor"]);
    for (const [rawKey, descriptor] of prototypeDescriptors) {
        if (ignoredPrototypeKeys.has(rawKey)) continue;

        const key = rawKey.toString();

        if (descriptor.get) {
            if (getters.has(key)) {
                getters.delete(key);
                unchangedCount++;
            } else {
                additions.getters.push(key);
                changedCount++;
            }

            if (descriptor.set) {
                if (setters.has(key)) {
                    setters.delete(key);
                    unchangedCount++;
                } else {
                    additions.setters.push(key);
                    changedCount++;
                }
            }

            continue;
        }

        if (descriptor.set) {
            if (setters.has(key)) {
                setters.delete(key);
                unchangedCount++;
            } else {
                additions.setters.push(key);
                changedCount++;
            }
            continue;
        }

        if (methods.has(key)) {
            methods.delete(key);
            unchangedCount++;
        } else {
            additions.methods.push(key);
            changedCount++;
        }
    }

    changedCount += methods.size + getters.size + setters.size;

    // Field removals
    const fields = new Set(source.fields);

    for (const field of matchedFields) {
        if (fields.has(field)) {
            fields.delete(field);
            unchangedCount++;
        } else {
            additions.fields.push(field);
            changedCount++;
        }
    }

    changedCount += fields.size;

    return {
        additions,
        removals: {
            constructorDefinition,
            staticMethodsAndFields: [...staticMethodsAndFields],
            staticGetters: [...staticGetters],
            staticSetters: [...staticSetters],
            methods: [...methods],
            getters: [...getters],
            setters: [...setters],
            fields: [...fields]
        },
        unchangedCount,
        changedCount
    };
}
