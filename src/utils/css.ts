/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function createAndAppendStyle(id: string, target: HTMLElement) {
    const style = document.createElement("style");
    style.id = id;
    target.append(style);
    return style;
}

export const classNameToSelector = (name: string, prefix = "") => name.split(" ").map(n => `.${prefix}${n}`).join("");

export type ClassNameFactoryArg = string | string[] | Record<string, unknown> | false | null | undefined | 0 | "";

/**
 * @param prefix The prefix to add to each class, defaults to `""`
 * @returns A classname generator function
 * @example
 * const cl = classNameFactory("plugin-");
 *
 * cl("base", ["item", "editable"], { selected: null, disabled: true })
 * // => "plugin-base plugin-item plugin-editable plugin-disabled"
 */
export const classNameFactory = (prefix: string = "") => (...args: ClassNameFactoryArg[]) => {
    const classNames = new Set<string>();
    for (const arg of args) {
        if (arg && typeof arg === "string") classNames.add(arg);
        else if (Array.isArray(arg)) arg.forEach(name => classNames.add(name));
        else if (arg && typeof arg === "object") Object.entries(arg).forEach(([name, value]) => value && classNames.add(name));
    }
    return Array.from(classNames, name => prefix + name).join(" ");
};
