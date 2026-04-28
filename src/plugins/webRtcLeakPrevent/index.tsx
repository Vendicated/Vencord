/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const logger = new Logger("WebRTCLeakPrevent");

interface RTCPeerConnectionWithWebKit {
    webkitRTCPeerConnection?: typeof RTCPeerConnection;
}

const getRTCPeerConnections = (): Array<{ name: string; ctor: typeof RTCPeerConnection; }> => {
    const connections: Array<{ name: string; ctor: typeof RTCPeerConnection; }> = [];

    if (typeof RTCPeerConnection !== "undefined") {
        connections.push({ name: "RTCPeerConnection", ctor: RTCPeerConnection });
    }

    const win = window as Window & RTCPeerConnectionWithWebKit;
    if (typeof win.webkitRTCPeerConnection !== "undefined") {
        connections.push({ name: "webkitRTCPeerConnection", ctor: win.webkitRTCPeerConnection! });
    }

    return connections;
};

let originalConnections: Array<{ name: string; ctor: typeof RTCPeerConnection; }> = [];

function createPatchedConnection(
    OriginalConnection: typeof RTCPeerConnection,
    icePolicy: string
): typeof RTCPeerConnection {
    return class extends OriginalConnection {
        constructor(configuration?: RTCConfiguration) {
            const patchedConfig: RTCConfiguration = {
                ...configuration,
                iceTransportPolicy: icePolicy as RTCIceTransportPolicy,
            };

            super(patchedConfig);

            if (settings.store.enableLogs) {
                const actualConfig = this.getConfiguration();
                logger.info(
                    `RTCPeerConnection created - ICE policy: ${actualConfig.iceTransportPolicy}`,
                    `ICE servers: ${actualConfig.iceServers?.length ?? 0}`,
                    `Bundle policy: ${actualConfig.bundlePolicy}`
                );
            }
        }

        setConfiguration(configuration: RTCConfiguration): void {
            const patchedConfig: RTCConfiguration = {
                ...configuration,
                iceTransportPolicy: icePolicy as RTCIceTransportPolicy,
            };

            if (settings.store.enableLogs && configuration.iceTransportPolicy !== icePolicy) {
                logger.warn(
                    "Discord attempted to change ICE policy to:",
                    configuration.iceTransportPolicy,
                    "- forcing back to:",
                    icePolicy
                );
            }

            super.setConfiguration(patchedConfig);
        }
    };
}

export const settings = definePluginSettings({
    icePolicy: {
        type: OptionType.SELECT,
        default: "relay",
        description: "ICE transport policy. Relay forces TURN relay only (best privacy), public allows public IP discovery.",
        options: [
            { label: "Relay Only (Best Privacy)", value: "relay", default: true },
            { label: "Public (Default Discord)", value: "all" },
        ],
    },
    enableLogs: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Enable debug logging to console.",
    },
});

export default definePlugin({
    name: "WebRTCLeakPrevent",
    description: "Prevents WebRTC IP leaks by forcing ICE policy to relay-only mode. Blocks Discord from exposing your real IP address during voice calls.",
  authors: [{ name: "Irritably", id: 928787166916640838n }],
    settings,

    start() {
        if (settings.store.icePolicy === "all") {
            if (settings.store.enableLogs) logger.info("Plugin disabled - allowing all ICE candidates");
            return;
        }

        const connections = getRTCPeerConnections();
        if (connections.length === 0) {
            logger.warn("No RTCPeerConnection APIs available");
            return;
        }

        originalConnections = connections;
        const icePolicy = settings.store.icePolicy;

        if (settings.store.enableLogs) {
            logger.info(`Patching ${connections.length} RTCPeerConnection API(s)`);
            logger.info(`Forcing ICE policy to: ${icePolicy}`);
        }

        for (const { name, ctor } of connections) {
            const PatchedConnection = createPatchedConnection(ctor, icePolicy);

            if (name === "webkitRTCPeerConnection") {
                (window as Window & RTCPeerConnectionWithWebKit).webkitRTCPeerConnection = PatchedConnection;
            } else {
                window.RTCPeerConnection = PatchedConnection;
            }

            if (settings.store.enableLogs) {
                logger.info(`✓ ${name} patched successfully`);
            }
        }

        if (settings.store.enableLogs) {
            logger.info("WebRTC leak prevention active - IP address protected");
        }
    },

    stop() {
        if (originalConnections.length === 0) return;

        for (const { name, ctor } of originalConnections) {
            if (name === "webkitRTCPeerConnection") {
                (window as Window & RTCPeerConnectionWithWebKit).webkitRTCPeerConnection = ctor;
            } else {
                window.RTCPeerConnection = ctor;
            }
        }

        originalConnections = [];

        if (settings.store.enableLogs) {
            logger.info("WebRTC leak prevention disabled");
        }
    },
});