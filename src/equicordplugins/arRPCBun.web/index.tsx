/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { popNotice, showNotice } from "@api/Notices";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { isAnyPluginDev, isEquicordGuild } from "@utils/misc";
import definePlugin, { OptionType, ReporterTestable } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher, UserStore } from "@webpack/common";

const fetchApplicationsRPC = findByCodeLazy('"Invalid Origin"', ".application");
const logger = new Logger("arRPCBun");

async function lookupAsset(applicationId: string, key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]))[0];
}

const apps: any = {};
async function lookupApp(applicationId: string): Promise<string> {
    const socket: any = {};
    await fetchApplicationsRPC(socket, applicationId);
    return socket.application;
}

let ws: WebSocket;
let reconnectTimer: NodeJS.Timeout | null = null;
const RECONNECT_INTERVAL = 5000;

export const settings = definePluginSettings({
    oldVerNotice: {
        type: OptionType.BOOLEAN,
        description: "old version notice for why arrpc bun doesnt work",
        default: false,
        hidden: true
    },
    oneTimeNotice: {
        type: OptionType.BOOLEAN,
        description: "One time notice for showing arrpc disabled",
        default: false,
        hidden: true
    },
});


export default definePlugin({
    name: "arRPCBun",
    description: "arRPCBun integration",
    authors: [EquicordDevs.creations],
    reporterTestable: ReporterTestable.None,
    enabledByDefault: IS_EQUIBOP,
    settings,

    commands: [
        {
            name: "arrpc-debug",
            description: "Show arRPCBun debug information",
            predicate: ctx => {
                const result = isAnyPluginDev(UserStore.getCurrentUser()?.id) || isEquicordGuild(ctx?.guild?.id, true);
                return result;
            },
            execute: () => {
                const arrpcStatus = IS_EQUIBOP ? VesktopNative.arrpc?.getStatus?.() : null;

                let content = "";

                if (IS_EQUIBOP) {
                    const version = VesktopNative.app.getVersion();
                    const gitHash = VesktopNative.app.getGitHash?.();
                    const shortHash = gitHash?.slice(0, 7);

                    content += `Equibop: v${version}`;
                    if (shortHash) {
                        content += ` • [${shortHash}](<https://github.com/Equicord/Equibop/commit/${gitHash}>)`;
                    }
                    content += "\n";
                }

                if (arrpcStatus) {
                    content += `Running: ${arrpcStatus.running ? "Yes" : "No"}\n`;
                    content += `Enabled: ${arrpcStatus.enabled ? "Yes" : "No"}\n`;

                    if (arrpcStatus.running) {
                        content += `Port: ${arrpcStatus.port}\n`;
                        content += `PID: ${arrpcStatus.pid}\n`;

                        if (arrpcStatus.uptime) {
                            const seconds = Math.floor(arrpcStatus.uptime / 1000);
                            const minutes = Math.floor(seconds / 60);
                            const hours = Math.floor(minutes / 60);

                            if (hours > 0) {
                                content += `Uptime: ${hours}h ${minutes % 60}m ${seconds % 60}s\n`;
                            } else if (minutes > 0) {
                                content += `Uptime: ${minutes}m ${seconds % 60}s\n`;
                            } else {
                                content += `Uptime: ${seconds}s\n`;
                            }
                        }
                    }

                    const info = [
                        arrpcStatus.restartCount > 0 && ["Restarts", arrpcStatus.restartCount],
                        arrpcStatus.bunPath && ["Bun", arrpcStatus.bunPath],
                        arrpcStatus.warnings?.length && ["Warnings", arrpcStatus.warnings.join(", ")],
                        arrpcStatus.lastError && ["Last Error", arrpcStatus.lastError],
                        arrpcStatus.lastExitCode && arrpcStatus.lastExitCode !== 0 && ["Exit Code", arrpcStatus.lastExitCode]
                    ].filter(Boolean);

                    content += info.map(([type, value]) => `${type}: ${value}`).join("\n");
                } else {
                    if (ws) {
                        content += ws.readyState === WebSocket.OPEN
                            ? "WebSocket: Connected to external arRPCBun server\n"
                            : `WebSocket: ${["Connecting", "Open", "Closing", "Closed"][ws.readyState]}\n`;
                    } else {
                        content += "WebSocket: Not connected\n";
                    }
                }

                return { content };
            },
        },
    ],

    async handleEvent(e: MessageEvent<any>) {
        const data = JSON.parse(e.data);

        const { activity } = data;
        const assets = activity?.assets;

        if (assets?.large_image) assets.large_image = await lookupAsset(activity.application_id, assets.large_image);
        if (assets?.small_image) assets.small_image = await lookupAsset(activity.application_id, assets.small_image);

        if (activity) {
            const appId = activity.application_id;
            apps[appId] ||= await lookupApp(appId);

            const app = apps[appId];
            activity.name ||= app.name;
        }

        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", ...data });
    },

    connect() {
        const arrpcStatus = IS_EQUIBOP ? VesktopNative.arrpc?.getStatus?.() : null;
        const host = arrpcStatus?.host || "127.0.0.1";
        const port = arrpcStatus?.port || 1337;

        const wsUrl = `ws://${host}:${port}`;
        logger.info(`Connecting to arRPCBun at ${wsUrl}${arrpcStatus?.host ? "" : " (using defaults)"}`);

        if (ws) ws.close();
        ws = new WebSocket(wsUrl);

        ws.onmessage = this.handleEvent;

        ws.onerror = error => {
            logger.error("WebSocket error:", error);
        };

        ws.onclose = () => {
            logger.info("WebSocket closed, will attempt reconnect in 5s");
            FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null });

            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                logger.info("Attempting to reconnect...");
                this.connect();
            }, RECONNECT_INTERVAL);
        };

        ws.onopen = () => {
            logger.info("Successfully connected to arRPCBun");
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };
    },

    async start() {
        // only works on 3.0.8+
        if (IS_EQUIBOP) {
            const version = VesktopNative.app.getVersion();
            const [major, minor, patch] = version.split(".").map(Number);

            if (major < 3 || (major === 3 && minor === 0 && patch < 8) && !settings.store.oldVerNotice) {
                logger.error(`Equibop ${version} is too old. Requires 3.0.8+ for arRPCBun fix.`);
                showNotice(`arRPCBun requires Equibop 3.0.8+. You have ${version}. Update Equibop to use this plugin.`, "OK", () => {
                    settings.store.oldVerNotice = true;
                    popNotice();
                });
                return;
            }
        }

        // disable WebRichPresence to avoid conflicts
        const webRPC = Vencord.Plugins.plugins.WebRichPresence;
        if (webRPC && Vencord.Plugins.isPluginEnabled("WebRichPresence")) {
            logger.info("Disabling WebRichPresence to avoid conflicts");
            Vencord.Plugins.stopPlugin(webRPC);
        }

        // get arRPC status from Equibop if available, otherwise use defaults
        const arrpcStatus = IS_EQUIBOP ? VesktopNative.arrpc?.getStatus?.() : null;

        // if on Equibop and arRPC is disabled AND not running, warn user
        if (IS_EQUIBOP && !arrpcStatus?.enabled && !arrpcStatus?.running && !settings.store.oneTimeNotice) {
            logger.warn("Equibop's built-in arRPC is disabled and not running");
            showNotice("arRPC is not running. Enable it in Equibop settings, or run your own arRPCBun server.", "OK", () => {
                settings.store.oneTimeNotice = true;
                popNotice();
            });
            return;
        }

        this.connect();
    },

    stop() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null });
        ws?.close();
        logger.info("Stopped arRPCBun connection");
    }
});
