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

import { PopoutWindowStore } from "@webpack/common";

export const styleMap = window.VencordStyles ??= new Map();

export interface Style {
    name: string;
    source: string;
    enabled: boolean;
    variables?: Record<string, string | number>;
}

export function requireStyle(name: string) {
    const style = styleMap.get(name);
    if (!style) throw new Error(`Style "${name}" does not exist`);
    return style;
}

/**
 * A style object can be obtained by importing a stylesheet with `?managed` at the end of the import
 * @param style The style object or name
 * @returns `false` if the style was already enabled, `true` otherwise
 * @example
 * import pluginStyle from "./plugin.css?managed";
 *
 * // Inside some plugin method like "start()" or "[option].onChange()"
 * enableStyle(pluginStyle);
 */
export function enableStyle(style: Style | string) {
    if (typeof style === "string") style = requireStyle(style);

    const previousState = style.enabled;

    style.enabled = true;
    compileStyle(style);

    return !previousState;
}

/**
 * @param style The style object or name
 * @returns `false` if the style was already disabled or cannot be found, `true` otherwise
 * @see {@link enableStyle} for info on importing managed styles
 */
export function disableStyle(style: Style | string) {
    if (typeof style === "string") {
        try {
            style = requireStyle(style);
        } catch (e) {
            return false;
        }
    }

    const previousState = style.enabled;

    style.enabled = false;
    compileStyle(style);

    return previousState;
}

/**
 * Set a style and update it.
 * @param style The new style object
 * @see {@link enableStyle} for info on importing managed styles
 */
export function setStyle(style: Style) {
    if (!styleMap.has(style.name)) styleMap.set(style.name, style);
    const storedStyle = requireStyle(style.name);
    Object.assign(storedStyle, style);
    compileStyle(storedStyle);
}

/**
 * Create a new style or update an existing style. Style will be enabled.
 * @param name The name of the style
 * @param source The CSS you want to inject
 * @see {@link enableStyle} for info on importing managed styles
 */
export function createStyle(name: string, source: string) {
    return setStyle({ name, source, enabled: true });
}

/**
 * Deletes a style.
 * This should only be used with programmatically injected styles.
 * @param style The style to delete
 * @see {@link enableStyle} for info on importing managed styles
 */
export function deleteStyle(style: Style | string) {
    if (typeof style === "string") {
        try {
            style = requireStyle(style);
        } catch (e) {
            return false;
        }
    }

    style.enabled = false;
    compileStyle(style);

    return styleMap.delete(style.name);
}

/**
 * Sets the variables of a style
 * ```ts
 * // -- plugin.ts --
 * import pluginStyle from "./plugin.css?managed";
 * import { setStyleVars } from "@api/Styles";
 * import { findByPropsLazy } from "@webpack";
 * const classNames = findByPropsLazy("thin", "scrollerBase"); // { thin: "thin-31rlnD scrollerBase-_bVAAt", ... }
 *
 * // Inside some plugin method like "start()"
 * setStyleClassNames(pluginStyle, classNames);
 * enableStyle(pluginStyle);
 * ```
 * ```scss
 * // -- plugin.css --
 * .plugin-root [--thin]::-webkit-scrollbar { ... }
 * ```
 * ```scss
 * // -- final stylesheet --
 * .plugin-root .thin-31rlnD.scrollerBase-_bVAAt::-webkit-scrollbar { ... }
 * ```
 * @param style The style object or name
 * @param variables An object where the keys are the variable names and the values are the variable values
 * @param recompile Whether to recompile the style after setting the variables, defaults to `true`
 * @see {@link classNamesToSelectors} for converting a class names object to variables
 * @see {@link enableStyle} for info on importing managed styles
 */
export const setStyleVariables = (style: Style | string, variables: Style["variables"], recompile = true) => {
    if (typeof style === "string") style = requireStyle(style);
    style.variables = variables;
    if (recompile) compileStyle(style);
};

/**
 * Updates the style in a document. This should only be called by {@link compileStyle} or when a new popout is created.
 * @param style A style object
 * @see {@link setStyleVariables} for more info on style classnames
 */
export function updateStyleInDocument(style: Style, doc: Document) {
    const parent = doc.documentElement;
    let styleElement = [...parent.querySelectorAll<HTMLStyleElement>("style[data-vencord-name]")].find(e => e.dataset.vencordName === style.name);
    if (style.enabled) {
        if (!styleElement) {
            styleElement = doc.createElement("style");
            styleElement.dataset.vencordName = style.name;
            parent.appendChild(styleElement);
        }
        let content = style.source;
        if (style.variables) {
            Object.entries(style.variables).forEach(([key, value]) => {
                const kebabCaseKey = key.replaceAll(/(?<=[a-z])[A-Z0-9]/g, v => `-${v}`).toLowerCase();
                content = content.replaceAll(`[--${kebabCaseKey}]`, value.toString());
            });
        }
        styleElement.textContent = content;
    } else styleElement?.remove();
}

/**
 * Updates a style in the DOM of all documents
 * @param style A style object
 * @see {@link setStyleVariables} for more info on style classnames
 */
export function compileStyle(style: Style) {
    const popouts = PopoutWindowStore?.getWindowKeys()?.map(k => PopoutWindowStore?.getWindow(k)?.document) ?? [];
    return [document, ...popouts].forEach(doc => updateStyleInDocument(style, doc));
}

/**
 * Adds all enabled styles to the DOM of all documents
 * @param doc The document to add styles to
 * @see {@link setStyleVariables} for more info on style classnames
 */
export function addStylesToDocument(doc: Document) {
    styleMap.forEach(style => updateStyleInDocument(style, doc));
}

/**
 * @param name The classname
 * @param prefix A prefix to add each class, defaults to `""`
 * @return A css selector for the classname
 * @example
 * classNameToSelector("foo bar") // => ".foo.bar"
 */
export const classNameToSelector = (name: string, prefix = "") => name.split(" ").map(n => `.${prefix}${n}`).join("");

/**
 * @param classNames The classNames object
 * @param prefix A prefix to add each class, defaults to `""`
 * @return A css selector for the classname
 * @example
 * classNamesToSelectors({ a: "foo bar" }) // => { a: ".foo.bar" }
 */
export const classNamesToSelectors = (classNames: Record<string, string>, prefix = "") => Object.fromEntries(Object.entries(classNames).map(([k, v]) => [k, classNameToSelector(v, prefix)]));

type ClassNameFactoryArg = string | string[] | Record<string, unknown> | false | null | undefined | 0 | "";
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
