/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sendBotMessage } from "@api/Commands";

export default [
    {
        name: "systeminfo",
        description: "Shows system information",
        options: [],
        execute: async (opts, ctx) => {
            try {
                const { userAgent, hardwareConcurrency, onLine, languages } = navigator;
                const { width, height, colorDepth } = window.screen;
                const { deviceMemory, connection }: { deviceMemory: any, connection: any; } = navigator as any;
                const platform = userAgent.includes("Windows") ? "Windows" :
                    userAgent.includes("Mac") ? "MacOS" :
                        userAgent.includes("Linux") ? "Linux" : "Unknown";
                const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
                const deviceType = isMobile ? "Mobile" : "Desktop";
                const browserInfo = userAgent.match(/(?:chrome|firefox|safari|edge|opr)\/?\s*(\d+)/i)?.[0] || "Unknown";
                const networkInfo = connection ? `${connection.effectiveType || "Unknown"}` : "Unknown";
                const info = [
                    `> **Platform**: ${platform}`,
                    `> **Device Type**: ${deviceType}`,
                    `> **Browser**: ${browserInfo}`,
                    `> **CPU Cores**: ${hardwareConcurrency || "N/A"}`,
                    `> **Memory**: ${deviceMemory ? `${deviceMemory}GB` : "N/A"}`,
                    `> **Screen**: ${width}x${height} (${colorDepth}bit)`,
                    `> **Languages**: ${languages?.join(", ")}`,
                    `> **Network**: ${networkInfo} (${onLine ? "Online" : "Offline"})`
                ].join("\n");
                return { content: info };
            } catch (err) {
                sendBotMessage(ctx.channel.id, { content: "Failed to fetch system information" });
            }
        },
    },
    {
        name: "getUptime",
        description: "Returns the system uptime",
        execute: async () => {
            const uptime = performance.now() / 1000;
            const uptimeInfo = `> **System Uptime**: ${Math.floor(uptime / 60)} minutes`;
            return { content: uptimeInfo };
        },
    },
    {
        name: "getTime",
        description: "Returns the current server time",
        execute: async () => {
            const currentTime = new Date().toLocaleString();
            return { content: `> **Current Time**: ${currentTime}` };
        },
    },
    {
        name: "getLocation",
        description: "Returns the user's approximate location based on IP",
        execute: async (opts, ctx) => {
            try {
                const response = await fetch("https://ipapi.co/json/");
                const data = await response.json();
                const locationInfo = `> **Country**: ${data.country_name}\n> **Region**: ${data.region}\n> **City**: ${data.city}`;
                return { content: locationInfo };
            } catch (err) {
                sendBotMessage(ctx.channel.id, { content: "Failed to fetch location information" });
            }
        },
    }
];
