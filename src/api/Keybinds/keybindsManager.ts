/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { KeybindShortcut } from "@utils/types";
import { GlobalShortcut, GlobalShortcutOptions } from "@vencord/discord-types";

import * as globalManager from "./globalManager";
import { WindowShortcut, WindowShortcutOptions } from "./windowManager";
import * as windowManager from "./windowManager";

export type Keybind = {
    event: string;
    function: () => void;
    options: GlobalShortcutOptions | WindowShortcutOptions;
    global: boolean;
};

export type InternalKeybind = Keybind & {
    id: number | undefined;
    enabled: boolean;
    keys: GlobalShortcut | WindowShortcut;
    global: boolean;
};

let globalLastId = 1000;
const keybindsGlobal: Map<string, InternalKeybind> = new Map();
const keybindsWindow: Map<string, InternalKeybind> = new Map();

// Overloads to ensure correct return type based on 'global'
function getBinding(event: string, global: boolean): InternalKeybind | undefined {
    return global ? keybindsGlobal.get(event) : keybindsWindow.get(event);
}

export function isNameAvailable(event: string, global: boolean): boolean {
    return global ? !keybindsGlobal.has(event) : !keybindsWindow.has(event);
}

export function registerKeybind(binding: Keybind, keys: KeybindShortcut = []) {
    if (!isNameAvailable(binding.event, binding.global)) return false;
    if (binding.global) {
        const id = globalLastId++;
        keybindsGlobal.set(binding.event, { id: id, keys: (keys as GlobalShortcut), enabled: false, ...(binding as Keybind) });
    } else {
        keybindsWindow.set(binding.event, { id: undefined, keys: (keys as WindowShortcut), enabled: false, ...(binding as Keybind) });
    }
    return true;
}

export function unregisterKeybind(event: string, global: boolean): boolean {
    const binding = getBinding(event, global);
    if (!binding) return false;
    if (binding.enabled) {
        disableKeybind(event, global);
    }
    return global ? keybindsGlobal.delete(event) : keybindsWindow.delete(event);
}

export function updateKeybind(event: string, keys: KeybindShortcut, global: boolean) {
    const binding = getBinding(event, global);
    if (!binding) return;
    binding.keys = keys;
    if (binding.enabled) {
        disableKeybind(event, global);
    }
    enableKeybind(event, global);
}

export function isEnabled(event: string, global: boolean) {
    const binding = getBinding(event, global);
    return !!binding && binding.enabled;
}

export function enableKeybind(event: string, global: boolean) {
    const binding = getBinding(event, global);
    if (!binding) return;
    if (binding.enabled || !binding.keys.length) return;
    if (global) {
        globalManager.registerKeybind(binding.id as number, binding.keys as GlobalShortcut, binding.function, binding.options as GlobalShortcutOptions);
    } else {
        windowManager.registerKeybind(binding.event, binding.keys as WindowShortcut, binding.function, binding.options);
    }
    binding.enabled = true;
}

export function disableKeybind(name: string, global: boolean) {
    if (global) {
        if (!globalManager.isAvailable()) return;
        const binding = getBinding(name, true);
        if (!binding) return;
        if (!binding.enabled || !binding.id) return;
        globalManager.unregisterKeybind(binding.id);
        binding.enabled = false;
    } else {
        const binding = getBinding(name, false);
        if (!binding) return;
        if (!binding.enabled) return;
        windowManager.unregisterKeybind(binding.event);
        binding.enabled = false;
    }
}
