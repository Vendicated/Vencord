/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { WindowShortcut } from "@utils/types";
import { GlobalShortcut, GlobalShortcutOptions } from "@vencord/discord-types";

import * as globalManager from "./globalManager";
import * as windowManager from "./windowManager";

export type Keybind<GLOBAL extends boolean> = {
    event: string;
    function: () => void;
    options: GLOBAL extends true ? GlobalShortcutOptions : WindowShortcutOptions;
    global: GLOBAL;
};
export type WindowShortcutOptions = {
    keydown: boolean;
    keyup: boolean;
};
export type KeybindWindow = {
    event: string;
    function: () => void;
    options: WindowShortcutOptions;
};

export type InternalKeybind<GLOBAL extends boolean> = Keybind<GLOBAL> & {
    id: GLOBAL extends true ? number : undefined;
    enabled: boolean;
    keys: GLOBAL extends true ? GlobalShortcut : WindowShortcut;
    global: GLOBAL;
};
type Shortcut<GLOBAL extends boolean> = GLOBAL extends true ? GlobalShortcut : WindowShortcut;

let globalLastId = 1000;
const keybindsGlobal: Map<string, InternalKeybind<true>> = new Map();
const keybindsWindow: Map<string, InternalKeybind<false>> = new Map();

// Overloads to ensure correct return type based on 'global'
function getBinding<GLOBAL extends false>(event: string, global: false): InternalKeybind<false> | undefined;
function getBinding<GLOBAL extends true>(event: string, global: true): InternalKeybind<true> | undefined;
function getBinding(event: string, global: boolean): InternalKeybind<boolean> | undefined {
    return global ? keybindsGlobal.get(event) : keybindsWindow.get(event);
}

export function isNameAvailable<GLOBAL extends boolean>(event: string, global: GLOBAL): boolean {
    return global ? !keybindsGlobal.has(event) : !keybindsWindow.has(event);
}

export function registerKeybind<GLOBAL extends boolean>(binding: Keybind<GLOBAL>, keys: Shortcut<GLOBAL> = []) {
    if (!isNameAvailable(binding.event, binding.global)) return false;
    if (binding.global) {
        const id = globalLastId++;
        keybindsGlobal.set(binding.event, { id: id, keys: (keys as GlobalShortcut), enabled: false, ...(binding as Keybind<true>) });
    } else {
        keybindsWindow.set(binding.event, { id: undefined, keys: (keys as WindowShortcut), enabled: false, ...(binding as Keybind<false>) });
    }
    return true;
}

export function unregisterKeybind<GLOBAL extends boolean>(event: string, global: GLOBAL): boolean {
    const binding = global ? keybindsGlobal.get(event) : keybindsWindow.get(event);
    if (!binding) return false;
    if (binding.enabled) {
        disableKeybind(event, global);
    }
    return global ? keybindsGlobal.delete(event) : keybindsWindow.delete(event);
}

export function updateKeybind<GLOBAL extends boolean>(event: string, keys: Shortcut<GLOBAL>, global: GLOBAL) {
    const binding = global ? keybindsGlobal.get(event) : keybindsWindow.get(event);
    if (!binding) return;
    binding.keys = keys;
    if (binding.enabled) {
        disableKeybind(event, global);
    }
    enableKeybind(event, global);
}

export function isEnabled<GLOBAL extends boolean>(event: string, global: GLOBAL) {
    const binding = global ? keybindsGlobal.get(event) : keybindsWindow.get(event);
    return !!binding && binding.enabled;
}

export function enableKeybind<GLOBAL extends boolean>(event: string, global: GLOBAL) {
    const binding = global ? getBinding<true>(event, true) : getBinding<false>(event, false);
    if (!binding) return;
    if (binding.enabled || !binding.keys.length) return;
    if (global) {
        if (!globalManager.isAvailable()) return;
        globalManager.registerKeybind(binding.id as number, binding.keys as GlobalShortcut, binding.function, binding.options as GlobalShortcutOptions);
    } else {
        windowManager.registerKeybind(binding.event, binding.keys as WindowShortcut, binding.function, binding.options as WindowShortcutOptions);
    }
    binding.enabled = true;
}

export function disableKeybind<GLOBAL extends boolean>(name: string, global: GLOBAL) {
    if (global) {
        if (!globalManager.isAvailable()) return;
        const binding = getBinding<true>(name, true);
        if (!binding) return;
        if (!binding.enabled) return;
        globalManager.unregisterKeybind(binding.id);
        binding.enabled = false;
    } else {
        const binding = getBinding<false>(name, false);
        if (!binding) return;
        if (!binding.enabled) return;
        windowManager.unregisterKeybind(binding.event);
        binding.enabled = false;
    }
}
