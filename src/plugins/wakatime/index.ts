/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { WakatimeAPI } from "./wakatime";

const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "Wakatime API Key",
        placeholder: "waka_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        onChange: () => {
            if (wakatimeAPI && settings.store.apiKey) {
                wakatimeAPI.updateApiKey(settings.store.apiKey);
            }
        },
        isValid: (value: string) => {
            if (!value) return "API Key is required";
            if (!value.startsWith("waka_")) return "API Key must start with 'waka_'";
            if (value.length !== 41) return "API Key must be 41 characters long";
            return true;
        }
    },
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Discord time tracking",
        default: true,
        onChange: (value: boolean) => {
            if (wakatimeAPI) {
                if (value) {
                    wakatimeAPI.startTracking();
                } else {
                    wakatimeAPI.stopTracking();
                }
            }
        }
    },
    heartbeatInterval: {
        type: OptionType.NUMBER,
        description: "Heartbeat interval (seconds)",
        default: 120,
        placeholder: "120",
        isValid: (value: number) => {
            if (value < 30) return "Heartbeat interval must be at least 30 seconds";
            if (value > 600) return "Heartbeat interval must be less than 10 minutes";
            return true;
        }
    },
    showDebugLogs: {
        type: OptionType.BOOLEAN,
        description: "Show debug logs in console",
        default: false
    }
});

let wakatimeAPI: WakatimeAPI | null = null;
let isWindowFocused = true;
let lastActivityTime = Date.now();
let heartbeatInterval: NodeJS.Timeout | null = null;

function updateLastActivity() {
    lastActivityTime = Date.now();
    if (Boolean(settings.store.showDebugLogs)) {
        console.log("[Wakatime] Activity detected");
    }
}

function shouldSendHeartbeat(): boolean {
    return Boolean(settings.store.enabled) &&
        Boolean(settings.store.apiKey) &&
        isWindowFocused;
}

function sendHeartbeat() {
    if (!shouldSendHeartbeat() || !wakatimeAPI) return;

    // Create a simple heartbeat for Discord usage
    const heartbeat = WakatimeAPI.createHeartbeat("Discord", {
        type: "app",
        editor: "Discord",
        category: "communicating",
        plugin: "vencord wakatime/1.0.0"
    });

    wakatimeAPI.sendHeartbeat(heartbeat)
        .then(response => {
            if (response.errors) {
                console.error("[Wakatime] Error sending heartbeat:", response.errors);
            } else if (Boolean(settings.store.showDebugLogs)) {
                console.log("[Wakatime] Heartbeat sent successfully");
            }
        })
        .catch(err => {
            console.error("[Wakatime] Failed to send heartbeat:", err);
        });
}

function startHeartbeatInterval() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }

    heartbeatInterval = setInterval(() => {
        sendHeartbeat();
    }, settings.store.heartbeatInterval * 1000);

    // Send initial heartbeat
    sendHeartbeat();
}

function onWindowFocus() {
    isWindowFocused = true;
    updateLastActivity();
    if (Boolean(settings.store.showDebugLogs)) {
        console.log("[Wakatime] Window focused");
    }
}

function onWindowBlur() {
    isWindowFocused = false;
    if (Boolean(settings.store.showDebugLogs)) {
        console.log("[Wakatime] Window blurred");
    }
}

function addEventListeners() {
    // Window focus/blur events
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("blur", onWindowBlur);

    // Activity detection events
    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "click"];
    activityEvents.forEach(event => {
        document.addEventListener(event, updateLastActivity, { passive: true });
    });

    if (Boolean(settings.store.showDebugLogs)) {
        console.log("[Wakatime] Event listeners added");
    }
}

function removeEventListeners() {
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("blur", onWindowBlur);

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "click"];
    activityEvents.forEach(event => {
        document.removeEventListener(event, updateLastActivity);
    });

    if (Boolean(settings.store.showDebugLogs)) {
        console.log("[Wakatime] Event listeners removed");
    }
}

export default definePlugin({
    name: "Wakatime",
    description: "Track Discord usage time with Wakatime",
    authors: [Devs.iLazer],
    settings,

    start() {
        console.log("[Wakatime] Plugin starting...");
        
        if (!settings.store.apiKey) {
            console.warn("[Wakatime] No API key set. Please configure in settings.");
            return;
        }

        // Initialize WakatimeAPI
        wakatimeAPI = new WakatimeAPI(settings.store.apiKey, Boolean(settings.store.showDebugLogs));

        // Start tracking
        wakatimeAPI.startTracking();

        // Add event listeners for activity tracking
        addEventListeners();
        updateLastActivity();

        if (Boolean(settings.store.enabled)) {
            // Start heartbeat interval tracking
            startHeartbeatInterval();
            console.log("[Wakatime] Heartbeat tracking enabled");
        } else {
            console.warn("[Wakatime] Tracking is disabled in settings");
        }

        console.log("[Wakatime] Plugin started successfully");
    },

    stop() {
        console.log("[Wakatime] Plugin stopping...");

        removeEventListeners();

        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }

        if (wakatimeAPI) {
            wakatimeAPI.stopTracking();
            wakatimeAPI = null;
        }

        console.log("[Wakatime] Plugin stopped");
    }
});
