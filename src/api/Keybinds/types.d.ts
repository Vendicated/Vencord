/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GlobalShortcut, GlobalShortcutOptions } from "@vencord/discord-types";

export type WindowShortcut = string[];
export type WindowShortcutOptions = {
    keydown: boolean;
    keyup: boolean;
};

export type KeybindShortcut = GlobalShortcut | WindowShortcut;
export type KeybindOptions = GlobalShortcutOptions | WindowShortcutOptions;

export type Keybind = {
    event: string;
    function: () => void;
    options: KeybindOptions;
    global: boolean;
};

export type InternalKeybind = Keybind & {
    enabled: boolean;
    keys: KeybindShortcut;
};

interface KeybindManager {
    isAvailable(): boolean;
    registerKeybind(event: string, keys: KeybindShortcut, callback: () => void, options: GlobalShortcutOptions): void;
    unregisterKeybind(event: string): void;
    inputCaptureKeys(inputId: string, callback: (keys: KeybindShortcut) => void): () => void;
    keysToString(keys: KeybindShortcut): string;
}
