/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GlobalShortcut, GlobalShortcutOptions } from "@vencord/discord-types";

import globalManager from "./globalManager";
import { InternalKeybind, Keybind, KeybindShortcut, WindowShortcut } from "./types";
import windowManager from "./windowManager";

export default new class KeybindsManager {
    private keybindsGlobal: Map<string, InternalKeybind> = new Map();
    private keybindsWindow: Map<string, InternalKeybind> = new Map();

    isAvailable(global: boolean) {
        return global ? globalManager.isAvailable() : windowManager.isAvailable();
    }

    inputCaptureKeys(inputId: string, callback: (keys: KeybindShortcut) => void, global: boolean) {
        return global ? globalManager.inputCaptureKeys(inputId, callback) : windowManager.inputCaptureKeys(inputId, callback);
    }

    keysToString(keys: KeybindShortcut, global: boolean): string {
        return global ? globalManager.keysToString(keys as GlobalShortcut) : windowManager.keysToString(keys as WindowShortcut);
    }

    private getBinding(event: string, global: boolean): InternalKeybind | undefined {
        return global ? this.keybindsGlobal.get(event) : this.keybindsWindow.get(event);
    }

    private isEventAvailable(event: string, global: boolean): boolean {
        return global ? !this.keybindsGlobal.has(event) : !this.keybindsWindow.has(event);
    }

    registerKeybind(binding: Keybind, keys: KeybindShortcut = []) {
        if (!this.isEventAvailable(binding.event, binding.global)) return false;
        if (binding.global) {
            this.keybindsGlobal.set(binding.event, { keys: (keys as GlobalShortcut), enabled: false, ...(binding as Keybind) });
        } else {
            this.keybindsWindow.set(binding.event, { keys: (keys as WindowShortcut), enabled: false, ...(binding as Keybind) });
        }
        return true;
    }

    unregisterKeybind(event: string, global: boolean): boolean {
        const binding = this.getBinding(event, global);
        if (!binding) return false;
        if (binding.enabled) {
            this.disableKeybind(event, global);
        }
        return global ? this.keybindsGlobal.delete(event) : this.keybindsWindow.delete(event);
    }

    updateKeybind(event: string, keys: KeybindShortcut, global: boolean) {
        const binding = this.getBinding(event, global);
        if (!binding) return;
        binding.keys = keys;
        if (binding.enabled) {
            this.disableKeybind(event, global);
        }
        this.enableKeybind(event, global);
    }

    enableKeybind(event: string, global: boolean) {
        const binding = this.getBinding(event, global);
        if (!binding) return;
        if (binding.enabled || !binding.keys.length) return;
        if (global) {
            globalManager.registerKeybind(binding.event, binding.keys as GlobalShortcut, binding.function, binding.options as GlobalShortcutOptions);
        } else {
            windowManager.registerKeybind(binding.event, binding.keys as WindowShortcut, binding.function, binding.options);
        }
        binding.enabled = true;
    }

    disableKeybind(event: string, global: boolean) {
        if (global) {
            if (!globalManager.isAvailable()) return;
            const binding = this.getBinding(event, true);
            if (!binding) return;
            if (!binding.enabled) return;
            globalManager.unregisterKeybind(binding.event);
            binding.enabled = false;
        } else {
            const binding = this.getBinding(event, false);
            if (!binding) return;
            if (!binding.enabled) return;
            windowManager.unregisterKeybind(binding.event);
            binding.enabled = false;
        }
    }
};
