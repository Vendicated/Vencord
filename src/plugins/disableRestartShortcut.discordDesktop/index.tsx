/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSetting, migratePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { useEffect, useState } from "@webpack/common";

import { parseRestartShortcut } from "./restartShortcut";
migratePluginSettings("DisableRestartShortcut", "ReloadShortcut");
migratePluginSetting("DisableRestartShortcut", "reloadShortcut", "restartShortcut");
const RestartShortcutNative = VencordNative.pluginHelpers.DisableRestartShortcut as PluginNative<typeof import("./native")>;
const settings = definePluginSettings({
    blockCtrlR: {
        type: OptionType.BOOLEAN,
        displayName: "Disable Ctrl + R",
        description: "Disable Ctrl + R shortcut.",
        default: true
    },
    restartShortcut: {
        type: OptionType.COMPONENT,
        default: "Ctrl+Shift+R",
        component: () => <RestartShortcutControls />
    }
}, {
    restartShortcut: {
        hidden() {
            return this.store.blockCtrlR;
        }
    }
});
function RestartShortcutControls() {
    const { restartShortcut } = settings.use(["restartShortcut"]);
    const [capturing, setCapturing] = useState(false);
    useEffect(() => {
        if (!capturing) return;
        void RestartShortcutNative.setCapturing(true);
        const onKeyDown = (event: KeyboardEvent) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.key === "Escape") {
                setCapturing(false);
                return;
            }
            const key = event.code.startsWith("Key") ? event.code.slice(3)
                : event.code.startsWith("Digit") ? event.code.slice(5)
                    : event.code;
            const restartShortcut = [event.ctrlKey && "Ctrl", event.altKey && "Alt", event.shiftKey && "Shift", key].filter(Boolean).join("+");
            if (event.metaKey || !parseRestartShortcut(restartShortcut)) return;
            settings.store.restartShortcut = restartShortcut;
            setCapturing(false);
        };
        window.addEventListener("keydown", onKeyDown, true);
        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
            void RestartShortcutNative.setCapturing(false);
        };
    }, [capturing]);
    return (
        <SettingsSection id="restartShortcut" name="Config Shortcut" description="" inlineSetting>
            <Button onClick={() => setCapturing(value => !value)}>
                {capturing ? "Press shortcut..." : `Config: ${restartShortcut}`}
            </Button>
        </SettingsSection>
    );
}
export default definePlugin({
    name: "DisableRestartShortcut",
    description: "Disables Ctrl+R or config with a custom shortcut.",
    authors: [Devs.Mashiro],
    tags: ["Shortcuts"],
    settings
});
