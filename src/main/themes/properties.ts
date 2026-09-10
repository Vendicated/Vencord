/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Parses theme settings declared via `@property` at-rules, using the same format as BetterDiscord

export interface ThemePropertyOption {
    value: string;
    label: string;
}

export interface ThemeProperty {
    /** Without the leading `--` */
    name: string;
    syntax: string;
    initialValue: string;

    /** The `name` descriptor. Rules without one are plain registrations, not settings */
    label: string;
    note?: string;
    /** `options: "value=Label | value2=Label 2"` */
    options?: ThemePropertyOption[];
    checkbox?: boolean;
    /** File picker in BetterDiscord. Only a URL input is shown for now */
    file?: boolean;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}

const PROPERTY_START_REGEX = /@property\s+--([\w-]+)\s*\{/y;

export function parseThemeProperties(css: string): ThemeProperty[] {
    // keyed by name as a property may be registered multiple times, the last one wins
    const properties = new Map<string, ThemeProperty>();

    for (let i = 0; i < css.length; i++) {
        const char = css[i];

        if (char === "/" && css[i + 1] === "*") {
            i = skipComment(css, i);
        } else if (char === '"' || char === "'") {
            i = skipString(css, i);
        } else if (char === "@") {
            PROPERTY_START_REGEX.lastIndex = i;
            const match = PROPERTY_START_REGEX.exec(css);
            if (!match) continue;

            const bodyStart = i + match[0].length;
            const bodyEnd = findBlockEnd(css, bodyStart);
            if (bodyEnd === -1) break;

            const property = parseProperty(match[1], css.slice(bodyStart, bodyEnd));
            if (property) properties.set(property.name, property);
            i = bodyEnd;
        }
    }

    return [...properties.values()];
}

/** Returns null for rules without a `name` descriptor, as those are plain registrations rather than settings */
function parseProperty(name: string, body: string): ThemeProperty | null {
    const descriptors = new Map<string, string>();
    for (const declaration of splitDeclarations(body)) {
        const colon = declaration.indexOf(":");
        if (colon === -1) continue;

        descriptors.set(
            declaration.slice(0, colon).trim().toLowerCase(),
            declaration.slice(colon + 1).trim()
        );
    }

    const getString = (key: string) => {
        const value = descriptors.get(key);
        return value == null ? undefined : unquote(value);
    };
    const getNumber = (key: string) => {
        const value = descriptors.get(key);
        if (value == null) return undefined;

        const number = Number(value);
        return Number.isFinite(number) ? number : undefined;
    };
    const getBoolean = (key: string) => descriptors.get(key) === "true";

    const label = getString("name");
    if (label == null) return null;

    const options = getString("options");

    return {
        name,
        syntax: getString("syntax") ?? "*",
        initialValue: descriptors.get("initial-value") ?? "",
        label,
        note: getString("note"),
        options: options ? parseOptions(options) : undefined,
        checkbox: getBoolean("checkbox"),
        file: getBoolean("file"),
        min: getNumber("min"),
        max: getNumber("max"),
        step: getNumber("step"),
        unit: getString("unit")
    };
}

function parseOptions(raw: string): ThemePropertyOption[] {
    return raw.split("|")
        .map(entry => entry.trim())
        .filter(Boolean)
        .map(entry => {
            const equals = entry.indexOf("=");
            if (equals === -1) return { value: entry, label: entry };

            return {
                value: entry.slice(0, equals).trim(),
                label: entry.slice(equals + 1).trim()
            };
        });
}

/**
 * Splits a declaration block on `;`, ignoring those inside strings or parentheses. Comments are removed.
 * Like in CSS, a declaration containing an unterminated string is dropped
 */
function splitDeclarations(body: string) {
    const declarations: string[] = [];
    let current = "";
    let depth = 0;
    let valid = true;

    for (let i = 0; i < body.length; i++) {
        const char = body[i];

        if (char === "/" && body[i + 1] === "*") {
            i = skipComment(body, i);
        } else if (char === '"' || char === "'") {
            const end = skipString(body, i);
            if (body[end] !== char) valid = false;
            current += body.slice(i, end + 1);
            i = end;
        } else if (char === ";" && depth <= 0) {
            if (valid) declarations.push(current);
            current = "";
            valid = true;
        } else {
            if (char === "(") depth++;
            else if (char === ")") depth--;
            current += char;
        }
    }

    if (valid) declarations.push(current);
    return declarations;
}

function unquote(value: string) {
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.length >= 2 && value[value.length - 1] === quote) {
        return value.slice(1, -1).replace(/\\(.)/gs, "$1");
    }
    return value;
}

/** Returns the index of the last character of the comment starting at `start` */
function skipComment(css: string, start: number) {
    const end = css.indexOf("*/", start + 2);
    return end === -1 ? css.length : end + 1;
}

/** Returns the index of the closing quote of the string starting at `start` */
function skipString(css: string, start: number) {
    const quote = css[start];
    for (let i = start + 1; i < css.length; i++) {
        if (css[i] === "\\") i++;
        else if (css[i] === quote || css[i] === "\n") return i;
    }
    return css.length;
}

/** Returns the index of the `}` closing the block whose content starts at `start`, or -1 if unterminated */
function findBlockEnd(css: string, start: number) {
    let depth = 1;
    for (let i = start; i < css.length; i++) {
        const char = css[i];

        if (char === "/" && css[i + 1] === "*") i = skipComment(css, i);
        else if (char === '"' || char === "'") i = skipString(css, i);
        else if (char === "{") depth++;
        else if (char === "}" && --depth === 0) return i;
    }
    return -1;
}
