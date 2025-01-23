/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginSettingDef } from "@utils/types";

function modifier_option(name: string, def: boolean = false): PluginSettingDef {
    return {
        description: `Require ${name}`,
        type: OptionType.BOOLEAN,
        default: def,
    };
}

function modifiers_match(
    e: KeyboardEvent,
    ctrl: boolean,
    alt: boolean,
    shift: boolean,
): boolean {
    if (ctrl && !e.ctrlKey) return false;
    if (alt && !e.altKey) return false;
    if (shift && !e.shiftKey) return false;
    return true;
}

export default definePlugin({
    name: "InboxJumpKeybind",
    description: "Adds a keybind for that tiny jump button in the inbox",
    authors: [Devs.arutonee],
    settings: definePluginSettings({
        ctrl: modifier_option("ctrl", true),
        alt: modifier_option("alt"),
        shift: modifier_option("shift"),
        key: {
            description:
                "The key to use (See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key for docs)",
            type: OptionType.STRING,
            default: ";",
        },
    }),
    start() {
        document.addEventListener("keydown", this.onKeyDown);
    },
    stop() {
        document.removeEventListener("keydown", this.onKeyDown);
    },
    onKeyDown(e: KeyboardEvent) {
        if (
            e.key == Settings.plugins.InboxJumpKeybind.key &&
            modifiers_match(
                e,
                Settings.plugins.InboxJumpKeybind.ctrl,
                Settings.plugins.InboxJumpKeybind.alt,
                Settings.plugins.InboxJumpKeybind.shift,
            )
        ) {
            const btn = <HTMLButtonElement | null> document.querySelector(
                "div[class^=jumpButton]",
            );
            if (btn) btn.click();
        }
    },
});
