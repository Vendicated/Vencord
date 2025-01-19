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

export const styleMap = window.VencordStyles ??= new Map();

export interface Style {
    name: string;
    source: string;
    enabled: boolean;
    edit?(source: string): string;
}

export function requireStyle(name: string) {
    const style = styleMap.get(name);
    if (!style) throw new Error(`Style "${name}" does not exist`);
    return style;
}

// TODO: Implement popouts
function findDocuments() {
    return [document];
}

/**
 * A style's name can be obtained from importing a stylesheet with `?managed` at the end of the import
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

    style.enabled = true;
    compileStyle(style);

    if (style.enabled)
        return false;

    return true;
}

/**
 * @param style The style object or name
 * @returns `false` if the style was already disabled, `true` otherwise
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

    compileStyle(style);

    if (!style.enabled)
        return false;

    style.enabled = false;
    return true;
}

/**
 * @param style The new style object
 * @see {@link enableStyle} for info on importing managed styles
 */
export function setStyle(style: Style) {
    if (!styleMap.has(style.name)) styleMap.set(style.name, style);
    const storedStyle = requireStyle(style.name);
    Object.assign(storedStyle, style);

    (style.enabled ? enableStyle : disableStyle)(storedStyle);
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
 * @param classNames An object where the keys are the variable names and the values are the variable values
 * @param recompile Whether to recompile the style after setting the variables, defaults to `true`
 * @see {@link enableStyle} for info on importing managed styles
 */
export const setStyleClassNames = (style: Style | string, classNames: Record<string, string>, recompile = true) => {
    if (typeof style === "string") style = requireStyle(style);
    style.edit = source => {
        return source
            .replace(/\[--(\w+)\]/g, (match, name) => {
                const className = classNames[name];
                return className ? classNameToSelector(className) : match;
            });
    };
    if (recompile) compileStyle(style);
};

/**
 * Updates the stylesheet after doing the following to the sourcecode:
 *   - Interpolate style classnames
 * @param style **_Must_ be a style with a DOM element**
 * @see {@link setStyleClassNames} for more info on style classnames
 */
export const compileStyle = (style: Style) => {
    findDocuments().forEach(doc => {
        let styleElement = [...doc.head.querySelectorAll<HTMLStyleElement>("style[data-vencord-name]")].find(e => e.dataset.vencordName === style.name);
        if (style.enabled) {
            if (!styleElement) {
                styleElement = doc.createElement("style");
                styleElement.dataset.vencordName = style.name;
                document.head.appendChild(styleElement);
            }
            styleElement.textContent = style.edit ? style.edit(style.source) : style.source;
        } else styleElement?.remove();
    });

};

/**
 * @param name The classname
 * @param prefix A prefix to add each class, defaults to `""`
 * @return A css selector for the classname
 * @example
 * classNameToSelector("foo bar") // => ".foo.bar"
 */
export const classNameToSelector = (name: string, prefix = "") => name.split(" ").map(n => `.${prefix}${n}`).join("");

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
