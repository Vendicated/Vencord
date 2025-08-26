/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GlobalShortcut, GlobalShortcutOptions } from "@vencord/discord-types";

let discordUtils: undefined | {
    inputEventRegister(id: number, keys: GlobalShortcut, callback: () => void, options: GlobalShortcutOptions): undefined;
    inputEventUnregister(id: number): undefined;
};

function initDiscordUtils() {
    if (discordUtils || !DiscordNative) return;
    discordUtils = DiscordNative.nativeModules.requireModule("discord_utils");
}

export function isAvailable() {
    initDiscordUtils();
    return !!discordUtils;
}

// From bd key registration
function newKeysInstance(keys: GlobalShortcut): GlobalShortcut {
    return keys.map(e => {
        const [t, n, r] = e;
        return typeof r === "string" ? [t, n, r] : [t, n];
    });
}

export function registerKeybind(id: number, keys: GlobalShortcut, callback: () => void, options: GlobalShortcutOptions) {
    initDiscordUtils();
    if (!discordUtils) return;
    discordUtils.inputEventRegister(id, newKeysInstance(keys), callback, options);
}

export function unregisterKeybind(id: number) {
    initDiscordUtils();
    if (!discordUtils) return;
    discordUtils.inputEventUnregister(id);
}
