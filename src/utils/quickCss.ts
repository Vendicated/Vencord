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

import { addSettingsListener, Settings } from "@api/settings";

import IpcEvents from "./IpcEvents";

let style: HTMLStyleElement;
let themesStyle: HTMLStyleElement;

export async function toggle(isEnabled: boolean) {
    if (!style) {
        if (isEnabled) {
            style = document.createElement("style");
            style.id = "vencord-custom-css";
            document.head.appendChild(style);
            VencordNative.ipc.on(IpcEvents.QUICK_CSS_UPDATE, (_, css: string) => style.textContent = css);
            style.textContent = await VencordNative.ipc.invoke(IpcEvents.GET_QUICK_CSS);
        }
    } else
        style.disabled = !isEnabled;
}

async function initThemes() {
    if (!themesStyle) {
        themesStyle = document.createElement("style");
        themesStyle.id = "vencord-themes";
        document.head.appendChild(themesStyle);
    }

    const { themeLinks } = Settings;
    const links = themeLinks.map(link => `@import url("${link.trim()}");`).join("\n");
    themesStyle.textContent = links;
}

document.addEventListener("DOMContentLoaded", () => {
    toggle(Settings.useQuickCss);
    addSettingsListener("useQuickCss", toggle);

    initThemes();
    addSettingsListener("themeLinks", initThemes);
});
