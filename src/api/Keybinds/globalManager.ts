/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DiscordUtils, GlobalShortcut, GlobalShortcutOptions } from "@vencord/discord-types";
import { findByCodeLazy } from "webpack";

import { KeybindManager } from "./types";

// Discord mapping from keycodes array to string (mouse, keyboard, gamepad)
const keycodesToString = IS_DISCORD_DESKTOP ? findByCodeLazy(".map(", ".KEYBOARD_KEY", ".KEYBOARD_MODIFIER_KEY", ".MOUSE_BUTTON", ".GAMEPAD_BUTTON") as (keys: GlobalShortcut) => string : (keys: GlobalShortcut) => keys.join("+");

export default new class GlobalManager implements KeybindManager {
    private discordUtils: undefined | DiscordUtils; // TODO: Maybe check if IS_VESKTOP and use its global keybinds api
    private lastGlobalId: number = 1000;
    private mapIdToEvent: Map<string, number> = new Map();

    private initDiscordUtils() {
        if (!IS_DISCORD_DESKTOP || this.discordUtils || !DiscordNative) return;
        this.discordUtils = DiscordNative.nativeModules.requireModule("discord_utils");
    }

    // From discord key registration
    private newKeysInstance(keys: GlobalShortcut): GlobalShortcut {
        return keys.map(e => {
            const [t, n, r] = e;
            return typeof r === "string" ? [t, n, r] : [t, n];
        });
    }

    private getIdForEvent(event: string): number {
        const found = this.mapIdToEvent.get(event);
        if (!found) {
            const id = this.lastGlobalId++;
            this.mapIdToEvent.set(event, id);
            return id;
        } else {
            return found;
        }
    }

    public isAvailable() {
        this.initDiscordUtils();
        return !!this.discordUtils;
    }

    public getDiscordUtils() {
        this.initDiscordUtils();
        return this.discordUtils;
    }

    public registerKeybind(event: string, keys: GlobalShortcut, callback: () => void, options: GlobalShortcutOptions) {
        this.initDiscordUtils();
        if (!this.discordUtils) return;
        const id = this.getIdForEvent(event);
        if (!id) return;
        this.discordUtils.inputEventRegister(id, this.newKeysInstance(keys), callback, options);
    }

    public unregisterKeybind(event: string) {
        this.initDiscordUtils();
        if (!this.discordUtils) return;
        const id = this.mapIdToEvent.get(event);
        if (!id) return;
        this.discordUtils.inputEventUnregister(id);
    }

    public inputCaptureKeys(inputId: string, callback: (keys: GlobalShortcut) => void): () => void {
        this.initDiscordUtils();
        if (!this.discordUtils) return () => { };
        return this.discordUtils.inputCaptureRegisterElement(inputId, callback);
    }

    public keysToString(keys: GlobalShortcut): string {
        return keycodesToString(keys).toUpperCase();
    }
};
