/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import { FluxDispatcher, showToast, Toasts } from "@webpack/common";
type BridgeAction = "TOGGLE_MUTE" | "TOGGLE_DEAFEN";
type SoundPlayer = { playSound: (sound: string, volume?: number) => void; };
type BridgeMessage = { action?: unknown; };

const logger = new Logger("CustomKeybinds");
const SoundModule = findByProps("playSound") as Partial<SoundPlayer> | undefined;
const BridgeUrl = "ws://localhost:6969";

let bridgeSocket: WebSocket | null = null;

function getSoundPlayer(): SoundPlayer {
    const playSound = SoundModule?.playSound;

    if (typeof playSound !== "function") {
        throw new Error("CustomKeybinds could not find the Discord sound player module.");
    }

    return { playSound };
}

function handleToggle(action: BridgeAction) {
    const soundPlayer = getSoundPlayer();

    FluxDispatcher.dispatch({
        type: action === "TOGGLE_MUTE"
            ? "AUDIO_TOGGLE_SELF_MUTE"
            : "AUDIO_TOGGLE_SELF_DEAF"
    });

    soundPlayer.playSound(action === "TOGGLE_MUTE" ? "mute" : "deafen", 0.5);
}

function onBridgeMessage(event: MessageEvent) {
    if (typeof event.data !== "string") {
        logger.error("Received non-text message from companion bridge:", event.data);
        return;
    }

    let payload: BridgeMessage;

    try {
        payload = JSON.parse(event.data) as BridgeMessage;
    } catch (error) {
        logger.error("Failed to parse companion bridge message:", error);
        showToast("CustomKeybinds received invalid JSON from the companion bridge.", Toasts.Type.FAILURE);
        return;
    }

    if (payload.action !== "TOGGLE_MUTE" && payload.action !== "TOGGLE_DEAFEN") {
        const message = `Received invalid companion bridge action: ${String(payload.action)}`;
        logger.error(message);
        showToast(message, Toasts.Type.FAILURE);
        return;
    }

    handleToggle(payload.action);
}

export default definePlugin({
    name: "CustomKeybinds",
    description: "Receives true global mute and deafen toggles from the companion bridge",
    authors: [{ name: "Jules", id: 0n }],
    start() {
        try {
            getSoundPlayer();
        } catch (error) {
            logger.error("Failed to initialize CustomKeybinds:", error);
            showToast(error instanceof Error ? error.message : "Failed to initialize CustomKeybinds.", Toasts.Type.FAILURE);
            return;
        }

        bridgeSocket?.close();

        bridgeSocket = new WebSocket(BridgeUrl);
        bridgeSocket.addEventListener("message", onBridgeMessage);
        bridgeSocket.addEventListener("error", error => {
            logger.error("Companion bridge WebSocket error:", error);
        });
        bridgeSocket.addEventListener("close", event => {
            if (event.wasClean) return;

            logger.error(`Companion bridge connection closed unexpectedly (code: ${event.code}).`);
            showToast("CustomKeybinds lost its connection to the companion bridge.", Toasts.Type.FAILURE);
        });
    },
    stop() {
        bridgeSocket?.removeEventListener("message", onBridgeMessage);
        bridgeSocket?.close();
        bridgeSocket = null;
    }
});
