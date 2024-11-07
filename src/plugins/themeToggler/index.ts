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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Toasts, UserStore } from "@webpack/common";

let themeEnabled = true;
let currentKey = "F10";

const keydown = (key: string) => {
    return async (e: KeyboardEvent) => {
        themeEnabled = !themeEnabled;
        // if key is F10
        e.key === key &&
            await toggleTheme();
    };
};

let currentKeydown: (e: KeyboardEvent) => void;
let enabledThemes: string[] = [];

let showToast = false;

const settings = definePluginSettings({
    hotkey: {
        default: "F10",
        description: "The hotkey to toggle the theme",
        type: OptionType.STRING,
        restartNeeded: false,
        placeholder: "F10",
        target: "BOTH",
        onChange: async () => {
            await reloadKeys(settings.store.hotkey);
        }
    },
    showToast: {
        default: false,
        description: "Show a toast when toggling the theme",
        type: OptionType.BOOLEAN,
        restartNeeded: false,
        target: "BOTH",
        onChange: () => {
            showToast = settings.store.showToast;
        }
    },
    disabledThemes: {
        default: "",
        hidden: true,
        target: "BOTH",
        restartNeeded: false,
        type: OptionType.STRING,
        description: "Store for disabled themes so they aren't voided on restart. This option is hidden."
    },
    triggerOnStream: {
        default: false,
        target: "BOTH",
        restartNeeded: false,
        type: OptionType.BOOLEAN,
        description: "Disable themes when starting a stream",
    }
});

export default definePlugin({
    authors: [Devs.RedCrafter07],
    description: "Toggle your themes with a hotkey",
    name: "ThemeToggler",
    async start() {
        currentKey = settings.store.hotkey;
        showToast = settings.store.showToast;
        currentKeydown = keydown(currentKey);

        document.addEventListener("keydown", currentKeydown);

        if (settings.plain.disabledThemes.length > 0 && Vencord.Settings.enabledThemes.length === 0) {
            enabledThemes = parseDisabledThemes();
        } else
            enabledThemes = Vencord.Settings.enabledThemes;
    },
    async stop() {
        document.removeEventListener("keydown", currentKeydown);

        // restore themes
        // -> shutdown might cause loss of previously enabled themes, so we restore them
        if (enabledThemes.length > 0)
            Vencord.Settings.enabledThemes = enabledThemes;
    },
    settings,
    // from the streamerModeOnStream plugin, special credit to Kodarru
    flux: {
        STREAM_CREATE: e => handleStream(e, true),
        STREAM_DELETE: e => handleStream(e, false),
    }
});

// partial implementation from the streamerModeOnStream plugin, credit to Kodarru
async function handleStream({ streamKey }: { streamKey: string; }, streamEnabled: boolean) {
    if (!settings.plain.triggerOnStream) return;
    if (!streamKey.endsWith(UserStore.getCurrentUser().id)) return;

    if ((Vencord.Settings.enabledThemes.length === 0) === streamEnabled) return;

    await toggleTheme();
}

async function reloadKeys(key: string) {
    if (key.length < 1) {
        settings.store.hotkey = currentKey;
        return;
    }
    document.removeEventListener("keydown", currentKeydown);

    currentKeydown = keydown(key);
    document.addEventListener("keydown", currentKeydown);

    currentKey = key;
}

async function toggleTheme() {
    if (Vencord.Settings.enabledThemes !== enabledThemes && Vencord.Settings.enabledThemes.length > 0) {
        enabledThemes = Vencord.Settings.enabledThemes;

        writeDisabledThemes(Vencord.Settings.enabledThemes);
    }

    themeEnabled = Vencord.Settings.enabledThemes.length > 0;

    if (!themeEnabled)
        Vencord.Settings.enabledThemes = enabledThemes;
    else
        Vencord.Settings.enabledThemes = [];

    if (showToast) Toasts.show({
        message: themeEnabled ? "Theme disabled" : "Theme enabled",
        id: "themeToggler",
        type: Toasts.Type.MESSAGE,
        options: {
            position: Toasts.Position.BOTTOM,
            duration: 0.75
        }
    });
}


function parseDisabledThemes() {
    return settings.plain.disabledThemes.split("%%%%") as string[];
}

function writeDisabledThemes(themes: string[]) {
    settings.plain.disabledThemes = themes.join("%%%%");
}
