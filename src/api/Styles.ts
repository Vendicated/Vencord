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

export const enableStyle = (name: string) => {
    const style = ensureStyle(name);

    if (style.mount?.isConnected) return false;

    style.mount ??= document.createElement("style");
    compileStyle(style);

    document.head.appendChild(style.mount);
    return true;
};

export const disableStyle = (name: string) => {
    const style = ensureStyle(name);
    if (!style.mount?.isConnected) return false;

    style.mount.remove();
    style.mount = null;
    return true;
};

export const toggleStyle = (name: string) =>
    ensureStyle(name).mount?.isConnected ? disableStyle(name) : enableStyle(name);


export const isStyleEnabled = (name: string) =>
    ensureStyle(name).mount?.isConnected ?? false;

export const setStyleVars = (name: string, vars: Record<string, string>) => {
    const style = ensureStyle(name);
    style.vars = vars;
    if (style.mount?.isConnected) compileStyle(style);
};

export const compileStyle = (style: Style) => {
    if (!style.mount) throw new Error("Style is not mounted");

    style.mount.textContent = style.source
        .replace(/(?<=#\{)(\w+)(?=\})/g, (_, name) => style.vars[name] ?? "");
};
