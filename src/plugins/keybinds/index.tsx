/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { keybinds } from "./components/keybinds";
import { SettingsView } from "./components/SettingsView";

const defaultSettings = {};
for (const keybind in keybinds) {
    defaultSettings[keybind] = {
        type: OptionType.CUSTOM,
        default: keybinds[keybind].default,
    };
}

const settings = definePluginSettings({
    keybinds: {
        type: OptionType.COMPONENT,
        component: () => {
            return (
                <SettingsView settings={settings} />
            );
        }
    },
    ...defaultSettings,
});

export default definePlugin({
    name: "Keybinds",
    description: "Bind keys to commands.",
    authors: [
        Devs.Ryfter
    ],
    settings,
    start() {
        document.addEventListener("keydown", this.event);
    },
    stop() {
        document.removeEventListener("keydown", this.event);
    },
    event(e: KeyboardEvent) {
        for (const keybind in keybinds) {
            const {
                enabled,
                key,
                ctrl,
                alt,
                shift,
            } = settings.store[keybind];
            const str: string = "e";
            if (
                enabled &&
                alt === e.altKey &&
                ctrl === e.ctrlKey &&
                shift === e.shiftKey &&
                key.toUpperCase() === e.key
            ) keybinds[keybind].action();
            console.log(keybinds[keybind]);
        }
    },
});
