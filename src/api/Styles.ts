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

import type { MapValue } from "type-fest/source/entry";

export type Style = MapValue<typeof VencordStyles>;

export const styleMap = window.VencordStyles ??= new Map();

export const ensureStyle = (name: string) => {
    const style = styleMap.get(name);
    if (!style) throw new Error(`Style "${name}" does not exist`);
    return style;
};

/**
 * A style's name can be obtained from importing a stylesheet with `?managed` at the end of the import
 * ```ts
 * import pluginStyle from "./plugin.css?managed";
 *
 * // Inside some plugin method like "start()" or "[option].onChange()"
 * enableStyle(pluginStyle);
 * ```
 * @param name The name of the style
 * @returns `false` if the style was already enabled, `true` otherwise
 */
export const enableStyle = (name: string) => {
    const style = ensureStyle(name);

    if (style.dom?.isConnected) return false;

    style.dom ??= document.createElement("style");
    compileStyle(style);

    document.head.appendChild(style.dom);
    return true;
};

/**
 * @param name The name of the style
 * @returns `false` if the style was already disabled, `true` otherwise
 * @see {@link enableStyle} for info on getting the name of an imported style
 */
export const disableStyle = (name: string) => {
    const style = ensureStyle(name);
    if (!style.dom?.isConnected) return false;

    style.dom.remove();
    style.dom = null;
    return true;
};

/**
 * @param name The name of the style
 * @returns `true` in most cases, may return `false` in some edge cases
 * @see {@link enableStyle} for info on getting the name of an imported style
 */
export const toggleStyle = (name: string) =>
    ensureStyle(name).dom?.isConnected ? disableStyle(name) : enableStyle(name);

/**
 * @param name The name of the style
 * @returns Whether the style is enabled
 * @see {@link enableStyle} for info on getting the name of an imported style
 */
export const isStyleEnabled = (name: string) =>
    ensureStyle(name).dom?.isConnected ?? false;

/**
 * Sets the variables of a style
 * ```ts
 * // -- plugin.ts --
 * import pluginStyle from "./plugin.css?managed";
 * import { setStyleVars } from "@api/Styles";
 * import { findByPropsLazy } from "@webpack";
 * const classNames = findByPropsLazy("thin", "scrollerBase"); // { thin: "thin-31rlnD scrollerBase-_bVAAt", ... }
 *
 * // Some plugin method like "start()"
 * setStyleVars(pluginStyle, classNames);
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
 * @param name The name of the style
 * @param classNames An object where the keys are the variable names and the values are the variable values
 * @param recompile Whether to recompile the style after setting the variables
 * @see {@link enableStyle} for info on getting the name of an imported style
 */
export const setStyleClassnames = (name: string, classNames: Record<string, string>, recompile = true) => {
    const style = ensureStyle(name);
    style.classNames = classNames;
    if (isStyleEnabled(style.name) && recompile) compileStyle(style);
};

/**
 * Sets the DOM style after processing the source with the following steps:
 *   - Interpolates style classnames
 * @param style **_Must_ be a style with a DOM element**
 * @see {@link setStyleClassnames} for more info on style classnames
 */
export const compileStyle = (style: Style) => {
    if (!style.dom) throw new Error("Style has no DOM element");

    style.dom.textContent = style.source
        .replace(/\[--(\w+)\]/g, (match, name) => {
            const className = style.classNames[name];
            return className ? classnameToSelector(className) : match;
        });
};

/**
 * @param name The classname
 * @return A css selector for the classname
 * @example
 * classnameToSelector("foo bar") // => ".foo.bar"
 */
export const classnameToSelector = (name: string) => name.split(" ").map(n => `.${n}`).join("");
