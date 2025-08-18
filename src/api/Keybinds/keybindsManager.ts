/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GlobalShortcut, GlobalShortcutOptions } from "@vencord/discord-types";


export type Keybind = {
    name: string;
    function: () => void;
    options: GlobalShortcutOptions;
};
type InternalKeybind = Keybind & {
    id: number;
    enabled: boolean;
    keys: GlobalShortcut;
};

let lastId = 1000;
const keybinds: Map<string, InternalKeybind> = new Map();

let discordUtils: undefined | {
    inputEventRegister(id: number, keys: GlobalShortcut, callback: () => void, options: GlobalShortcutOptions): undefined;
    inputEventUnregister(id: number): undefined;
};

export function initDiscordUtils() {
    if (discordUtils || !DiscordNative) return;
    discordUtils = DiscordNative.nativeModules.requireModule("discord_utils");
}

export async function isAvailable(): Promise<boolean> {
    if (!discordUtils) return false;
    return true;
}

export function isNameAvailable(name: string): boolean {
    return !keybinds.has(name);
}

export function registerKeybind(binding: Keybind, keys: GlobalShortcut = []) {
    if (!isNameAvailable(binding.name)) false;
    const id = lastId++;
    keybinds.set(binding.name, { id, keys, enabled: false, ...binding });
    return true;
}

export function unregisterKeybind(name: string): boolean {
    const binding = keybinds.get(name);
    if (!binding) return false;
    if (binding.enabled) {
        disableKeybind(name);
    }
    return keybinds.delete(name);
}

export function updateKeybind(name: string, keys: GlobalShortcut) {
    const binding = keybinds.get(name);
    if (!binding) return;
    binding.keys = keys;
    if (binding.enabled) {
        disableKeybind(name);
    }
    enableKeybind(name);
}

// From bd key registration
function newKeysInstance(keys: GlobalShortcut): GlobalShortcut {
    return keys.map(e => {
        const [t, n, r] = e;
        return typeof r === "string" ? [t, n, r] : [t, n];
    });
}

export function isEnabled(name: string) {
    const binding = keybinds.get(name);
    return !!binding && binding.enabled;
}

export function enableKeybind(name: string) {
    initDiscordUtils();
    if (!discordUtils) return;
    const binding = keybinds.get(name);
    if (!binding) return;
    if (binding.enabled || !binding.keys.length) return;
    discordUtils.inputEventRegister(binding.id, newKeysInstance(binding.keys), binding.function, binding.options);
    binding.enabled = true;
}

export function disableKeybind(name: string) {
    initDiscordUtils();
    if (!discordUtils) return;
    const binding = keybinds.get(name);
    if (!binding) return;
    if (!binding.enabled) return;
    discordUtils.inputEventUnregister(binding.id);
    binding.enabled = false;
}
