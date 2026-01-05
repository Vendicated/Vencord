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

import { Settings, SettingsStore } from "@api/Settings";
import { createAndAppendStyle } from "@utils/css";
import { ThemeStore } from "@vencord/discord-types";
import { PopoutWindowStore } from "@webpack/common";

import { userStyleRootNode, vencordRootNode } from "./Styles";

let style: HTMLStyleElement;
let themesStyle: HTMLStyleElement;

async function toggle(isEnabled: boolean) {
    if (!style) {
        if (isEnabled) {
            style = createAndAppendStyle("vencord-custom-css", userStyleRootNode);
            VencordNative.quickCss.addChangeListener(css => {
                style.textContent = css;
                // At the time of writing this, changing textContent resets the disabled state
                style.disabled = !Settings.useQuickCss;
                updatePopoutWindows();
            });
            style.textContent = await VencordNative.quickCss.get();
        }
    } else
        style.disabled = !isEnabled;
}

async function initThemes() {
    themesStyle ??= createAndAppendStyle("vencord-themes", userStyleRootNode);

    const { enabledThemeLinks, enabledThemes } = Settings;

    const { ThemeStore } = require("@webpack/common/stores") as typeof import("@webpack/common/stores");

    // "darker" and "midnight" both count as dark
    // This function is first called on DOMContentLoaded, so ThemeStore may not have been loaded yet
    const activeTheme = ThemeStore == null
        ? undefined
        : ThemeStore.theme === "light" ? "light" : "dark";

    const links = enabledThemeLinks
        .map(rawLink => {
            const match = /^@(light|dark) (.*)/.exec(rawLink);
            if (!match) return rawLink;

            const [, mode, link] = match;
            return mode === activeTheme ? link : null;
        })
        .filter(link => link !== null);

    if (IS_WEB) {
        for (const theme of enabledThemes) {
            const themeData = await VencordNative.themes.getThemeData(theme);
            if (!themeData) continue;
            const blob = new Blob([themeData], { type: "text/css" });
            links.push(URL.createObjectURL(blob));
        }
    } else {
        const localThemes = enabledThemes.map(theme => `vencord:///themes/${theme}?v=${Date.now()}`);
        links.push(...localThemes);
    }

    themesStyle.textContent = links.map(link => `@import url("${link.trim()}");`).join("\n");
    updatePopoutWindows();
}

function applyToPopout(popoutWindow: Window | undefined, key: string) {
    if (!popoutWindow?.document) return;
    // skip game overlay cuz it needs to stay transparent, themes broke it
    if (key === "DISCORD_OutOfProcessOverlay") return;

    const doc = popoutWindow.document;

    doc.querySelector("vencord-root")?.remove();

    doc.documentElement.appendChild(vencordRootNode.cloneNode(true));
}

function updatePopoutWindows() {
    if (!PopoutWindowStore) return;

    for (const key of PopoutWindowStore.getWindowKeys()) {
        applyToPopout(PopoutWindowStore.getWindow(key), key);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (IS_USERSCRIPT) return;

    initThemes();

    toggle(Settings.useQuickCss);
    SettingsStore.addChangeListener("useQuickCss", toggle);

    SettingsStore.addChangeListener("enabledThemeLinks", initThemes);
    SettingsStore.addChangeListener("enabledThemes", initThemes);

    window.addEventListener("message", event => {
        const { discordPopoutEvent } = event.data || {};
        if (discordPopoutEvent?.type !== "loaded") return;

        applyToPopout(PopoutWindowStore.getWindow(discordPopoutEvent.key), discordPopoutEvent.key);
    });

    if (!IS_WEB) {
        VencordNative.quickCss.addThemeChangeListener(initThemes);
    }
}, { once: true });

export function initQuickCssThemeStore(themeStore: ThemeStore) {
    if (IS_USERSCRIPT) return;

    initThemes();

    let currentTheme = themeStore.theme;
    themeStore.addChangeListener(() => {
        if (currentTheme === themeStore.theme) return;

        currentTheme = themeStore.theme;
        initThemes();
    });
}
