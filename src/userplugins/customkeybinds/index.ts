/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import definePlugin, { PluginNative } from "@utils/types";
import { findByProps } from "@webpack";
import { FluxDispatcher, showToast, Toasts } from "@webpack/common";

import type * as NativeModule from "./native";

type GlobalToggleAction = "mute" | "deafen";
type SoundPlayer = { playSound: (sound: string, volume?: number) => void; };

const logger = new Logger("CustomKeybinds");
const Native = IS_DISCORD_DESKTOP || IS_VESKTOP
    ? VencordNative.pluginHelpers.CustomKeybinds as PluginNative<typeof NativeModule>
    : null;

const SoundModule = findByProps("playSound") as Partial<SoundPlayer> | undefined;

const ToggleEventName = "vc-custom-keybinds-global-toggle";
const ErrorEventName = "vc-custom-keybinds-global-error";

function getDesktopBridge(): PluginNative<typeof NativeModule> {
    if (!Native) {
        throw new Error("CustomKeybinds requires the desktop native bridge.");
    }

    return Native;
}

function getSoundPlayer(): SoundPlayer {
    const playSound = SoundModule?.playSound;

    if (typeof playSound !== "function") {
        throw new Error("CustomKeybinds could not find the Discord sound player module.");
    }

    return { playSound };
}

function handleToggle(action: GlobalToggleAction) {
    const soundPlayer = getSoundPlayer();

    FluxDispatcher.dispatch({
        type: action === "mute"
            ? "AUDIO_TOGGLE_SELF_MUTE"
            : "AUDIO_TOGGLE_SELF_DEAF"
    });

    soundPlayer.playSound(action, 0.5);
}

function onGlobalToggle(event: Event) {
    const action = (event as CustomEvent<unknown>).detail;

    if (action !== "mute" && action !== "deafen") {
        const message = `Received invalid global toggle action: ${String(action)}`;
        logger.error(message);
        showToast(message, Toasts.Type.FAILURE);
        return;
    }

    handleToggle(action);
}

function onNativeError(event: Event) {
    const message = (event as CustomEvent<unknown>).detail;

    if (typeof message !== "string" || !message.length) {
        logger.error("Received invalid native bridge error payload:", message);
        showToast("CustomKeybinds native bridge failed with an invalid error payload.", Toasts.Type.FAILURE);
        return;
    }

    logger.error(message);
    showToast(message, Toasts.Type.FAILURE);
}

export default definePlugin({
    name: "CustomKeybinds",
    description: "Registers true global mute and deafen toggles for Vesktop/Discord desktop",
    authors: [{ name: "Jules", id: 0n }],
    start() {
        let native: PluginNative<typeof NativeModule>;

        try {
            native = getDesktopBridge();
            getSoundPlayer();
        } catch (error) {
            logger.error("Failed to initialize CustomKeybinds:", error);
            showToast(error instanceof Error ? error.message : "Failed to initialize CustomKeybinds.", Toasts.Type.FAILURE);
            return;
        }

        window.addEventListener(ToggleEventName, onGlobalToggle as EventListener);
        window.addEventListener(ErrorEventName, onNativeError as EventListener);

        void native.start().catch(error => {
            const message = error instanceof Error ? error.message : "Failed to start native global toggle bridge.";
            logger.error("Failed to start native global toggle bridge:", error);
            showToast(message, Toasts.Type.FAILURE);
        });
    },
    stop() {
        window.removeEventListener(ToggleEventName, onGlobalToggle as EventListener);
        window.removeEventListener(ErrorEventName, onNativeError as EventListener);

        if (!Native) return;

        void Native.stop().catch(error => {
            logger.error("Failed to stop native global toggle bridge:", error);
            showToast(
                error instanceof Error ? error.message : "Failed to stop native global toggle bridge.",
                Toasts.Type.FAILURE
            );
        });
    }
});
