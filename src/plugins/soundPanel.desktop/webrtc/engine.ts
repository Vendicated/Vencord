/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "@plugins/soundPanel.desktop/settings";

let webrtc = !IS_DISCORD_DESKTOP;

export function detectVoiceEngine() {
    webrtc = !IS_DISCORD_DESKTOP || settings.store.webrtcEngine;
}

export const usesWebRTCEngine = () => webrtc;

export const usesDesktopWebRTC = () => IS_DISCORD_DESKTOP && webrtc;

const AUTO_SENSITIVITY_THRESHOLD = -40;

export function getVoiceActivityThreshold({ vadThreshold, vadAutoThreshold }: { vadThreshold: number; vadAutoThreshold?: boolean; }) {
    return vadAutoThreshold ? AUTO_SENSITIVITY_THRESHOLD : vadThreshold;
}
