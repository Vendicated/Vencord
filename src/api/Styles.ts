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

import { generateTextCss } from "@components/BaseText";
import { generateMarginCss } from "@components/margins";
import { classNameFactory as _classNameFactory, classNameToSelector, createAndAppendStyle } from "@utils/css";

// Backwards compat for Vesktop
/** @deprecated Import this from `@utils/css` instead */
export const classNameFactory = _classNameFactory;

export interface Style {
    name: string;
    source: string;
    classNames: Record<string, string>;
    dom: HTMLStyleElement | null;
}

export const styleMap = window.VencordStyles ??= new Map();

export const vencordRootNode = document.createElement("vencord-root");
/**
 * Houses all Vencord core styles. This includes all imported css files
 */
export const coreStyleRootNode = document.createElement("vencord-styles");
/**
 * Houses all plugin specific managed styles
 */
export const managedStyleRootNode = document.createElement("vencord-managed-styles");
/**
 * Houses the user's themes and quick css
 */
export const userStyleRootNode = document.createElement("vencord-user-styles");

vencordRootNode.style.display = "none";
vencordRootNode.append(coreStyleRootNode, managedStyleRootNode, userStyleRootNode);

export function initStyles() {
    const osValuesNode = createAndAppendStyle("vencord-os-theme-values", coreStyleRootNode);
    createAndAppendStyle("vencord-text", coreStyleRootNode).textContent = generateTextCss();
    const rendererCssNode = createAndAppendStyle("vencord-css-core", coreStyleRootNode);
    const vesktopCssNode = IS_VESKTOP ? createAndAppendStyle("vesktop-css-core", coreStyleRootNode) : null;
    createAndAppendStyle("vencord-margins", coreStyleRootNode).textContent = generateMarginCss();

    VencordNative.native.getRendererCss().then(css => rendererCssNode.textContent = css);
    if (IS_DEV) {
        VencordNative.native.onRendererCssUpdate(newCss => {
            rendererCssNode.textContent = newCss;
        });
    }

    if (IS_VESKTOP && VesktopNative.app.getRendererCss || IS_EQUIBOP && VesktopNative.app.getRendererCss) {
        VesktopNative.app.getRendererCss().then(css => vesktopCssNode!.textContent = css);
        VesktopNative.app.onRendererCssUpdate(newCss => {
            vesktopCssNode!.textContent = newCss;
        });
    }

    VencordNative.themes.getSystemValues().then(values => {
        const variables = Object.entries(values)
            .filter(([, v]) => !!v)
            .map(([k, v]) => `--${k}: ${v};`)
            .join("");
        osValuesNode.textContent = `:root{${variables}}`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.append(vencordRootNode);
}, { once: true });

export function requireStyle(name: string) {
    const style = styleMap.get(name);
    if (!style) throw new Error(`Style "${name}" does not exist`);
    return style;
}

/**
 * A style's name can be obtained from importing a stylesheet with `?managed` at the end of the import
 * @param name The name of the style
 * @returns `false` if the style was already enabled, `true` otherwise
 * @example
 * import pluginStyle from "./plugin.css?managed";
 *
 * // Inside some plugin method like "start()" or "[option].onChange()"
 * enableStyle(pluginStyle);
 */
export function enableStyle(name: string) {
    const style = requireStyle(name);

    if (style.dom?.isConnected)
        return false;

    if (!style.dom) {
        style.dom = document.createElement("style");
        style.dom.dataset.vencordName = style.name;
    }
    compileStyle(style);

    managedStyleRootNode.appendChild(style.dom);
    return true;
}

/**
 * @param name The name of the style
 * @returns `false` if the style was already disabled, `true` otherwise
 * @see {@link enableStyle} for info on getting the name of an imported style
 */
export function disableStyle(name: string) {
    const style = requireStyle(name);
    if (!style.dom?.isConnected)
        return false;

    style.dom.remove();
    style.dom = null;
    return true;
}

/**
 * @param name The name of the style
 * @returns `true` in most cases, may return `false` in some edge cases
 * @see {@link enableStyle} for info on getting the name of an imported style
 */
export const toggleStyle = (name: string) => isStyleEnabled(name) ? disableStyle(name) : enableStyle(name);

/**
 * @param name The name of the style
 * @returns Whether the style is enabled
 * @see {@link enableStyle} for info on getting the name of an imported style
 */
export const isStyleEnabled = (name: string) => requireStyle(name).dom?.isConnected ?? false;

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
 * @param name The name of the style
 * @param classNames An object where the keys are the variable names and the values are the variable values
 * @param recompile Whether to recompile the style after setting the variables, defaults to `true`
 * @see {@link enableStyle} for info on getting the name of an imported style
 */
export const setStyleClassNames = (name: string, classNames: Record<string, string>, recompile = true) => {
    const style = requireStyle(name);
    style.classNames = classNames;
    if (recompile && isStyleEnabled(style.name))
        compileStyle(style);
};

/**
 * Updates the stylesheet after doing the following to the sourcecode:
 *   - Interpolate style classnames
 * @param style **_Must_ be a style with a DOM element**
 * @see {@link setStyleClassNames} for more info on style classnames
 */
export const compileStyle = (style: Style) => {
    if (!style.dom) throw new Error("Style has no DOM element");

    style.dom.textContent = style.source
        .replace(/\[--(\w+)\]/g, (match, name) => {
            const className = style.classNames[name];
            return className ? classNameToSelector(className) : match;
        });
};
