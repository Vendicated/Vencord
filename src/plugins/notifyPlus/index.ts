/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";

interface PluginStats {
    started: string;
    messagesProcessed: number;
    alertsTriggered: number;
    lastAlert: string | null;
    status: string;
}

let stats: PluginStats = {
    started: new Date().toISOString(),
    messagesProcessed: 0,
    alertsTriggered: 0,
    lastAlert: null,
    status: "Active"
};

const settings = definePluginSettings({
    priorityChannels: {
        type: OptionType.STRING,
        description: "Priority channel IDs (comma separated)",
        default: "",
        placeholder: "123456789012345678, 987654321098765432"
    },
    alertType: {
        type: OptionType.SELECT,
        description: "Alert type for priority channels",
        options: [
            { label: "Sound only", value: "sound" },
            { label: "Screen flash", value: "flash" },
            { label: "Popup notification", value: "popup" },
            { label: "All alerts", value: "all" }
        ],
        default: "all"
    },
    soundType: {
        type: OptionType.SELECT,
        description: "Alert sound type",
        options: [
            { label: "Simple beep", value: "beep" },
            { label: "Double alert", value: "double" },
            { label: "Urgent sound", value: "urgent" },
            { label: "Custom URL", value: "custom" }
        ],
        default: "urgent"
    },
    customSoundUrl: {
        type: OptionType.STRING,
        description: "Custom sound URL (trusted domains only)",
        default: "",
        placeholder: "https://cdn.discordapp.com/attachments/.../sound.mp3"
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Alert volume (0-100%)",
        default: 50,
        markers: [0, 25, 50, 75, 100],
        stickToMarkers: false
    },
    flashColor: {
        type: OptionType.STRING,
        description: "Flash color (hex)",
        default: "#ff0000",
        placeholder: "#ff0000"
    },
    flashDuration: {
        type: OptionType.SLIDER,
        description: "Flash duration (ms)",
        default: 500,
        markers: [100, 300, 500, 1000, 2000],
        stickToMarkers: false
    },
    debugMode: {
        type: OptionType.BOOLEAN,
        description: "Enable debug logging",
        default: false
    },
    showStats: {
        type: OptionType.BOOLEAN,
        description: "Show plugin statistics",
        default: true
    }
});

function log(level: "info" | "warn" | "error", message: string, data?: any) {
    if (!settings.store.debugMode) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[notifyPlus ${timestamp}]`;
    console[level](`${prefix} ${message}`, data || "");
}

function showStats() {
    if (!settings.store.showStats) return;

    console.info(`
╭────── notifyPlus Statistics ──────╮
│ Status: ${stats.status}
│ Started: ${new Date(stats.started).toLocaleString()}
│ Messages processed: ${stats.messagesProcessed}
│ Alerts triggered: ${stats.alertsTriggered}
│ Last alert: ${stats.lastAlert || "None"}
╰───────────────────────────────────╯
    `);
}

function isSafeUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const allowedDomains = [
            'discord.com', 'discordapp.net', 'discordapp.com',
            'youtube.com', 'youtu.be', 'imgur.com', 'giphy.com',
            'streamable.com', 'tenor.com', 'tenor.co'
        ];

        return allowedDomains.some(domain =>
            urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}

function playBeep(frequency: number, duration: number, volume: number, delay = 0) {
    setTimeout(() => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const gainNode = audioContext.createGain();
        const oscillator = audioContext.createOscillator();
        
        gainNode.connect(audioContext.destination);
        oscillator.connect(gainNode);
        
        gainNode.gain.value = volume / 100;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration / 1000);
    }, delay);
}

function generateSound(type: string, volume: number) {
    try {
        log("info", `Playing sound: ${type}`);

        switch (type) {
            case "beep":
                playBeep(800, 200, volume);
                break;
            case "double":
                playBeep(800, 150, volume);
                playBeep(800, 150, volume, 200);
                break;
            case "urgent":
                playBeep(1000, 100, volume);
                playBeep(1200, 100, volume, 120);
                playBeep(1000, 100, volume, 240);
                break;
        }
    } catch (error) {
        log("error", "Sound generation failed", error);
    }
}

function playCustomSound(url: string, volume: number) {
    try {
        if (!isSafeUrl(url)) {
            log("warn", "Unsafe URL blocked, using fallback sound");
            generateSound("urgent", volume);
            return;
        }

        const audio = new Audio(url);
        audio.volume = volume / 100;
        
        audio.onerror = () => generateSound("urgent", volume);
        audio.play().catch(() => generateSound("urgent", volume));
    } catch (error) {
        log("error", "Custom sound failed", error);
        generateSound("urgent", volume);
    }
}

function createFlash() {
    try {
        const overlay = document.createElement("div");
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(45deg, ${settings.store.flashColor}88, ${settings.store.flashColor}44);
            z-index: 10000;
            pointer-events: none;
            animation: notifyFlash ${settings.store.flashDuration}ms ease-out;
        `;

        if (!document.getElementById("notify-flash-style")) {
            const style = document.createElement("style");
            style.id = "notify-flash-style";
            style.textContent = `
                @keyframes notifyFlash {
                    0% { opacity: 0.8; transform: scale(1.05); }
                    50% { opacity: 0.4; transform: scale(1); }
                    100% { opacity: 0; transform: scale(0.95); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), settings.store.flashDuration);
    } catch (error) {
        log("error", "Flash creation failed", error);
    }
}

function createPopup(message: any) {
    try {
        const channel = ChannelStore.getChannel(message.channel_id);
        const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
        const channelName = channel?.name || "Unknown Channel";
        const guildName = guild?.name || "DM";
        const authorName = message.author?.username || "User";

        const popup = document.createElement("div");
        popup.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff4444, #ff6666);
            color: white;
            padding: 15px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(255, 68, 68, 0.4);
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
            font-weight: 500;
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;

        popup.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div style="font-size: 18px;">🚨</div>
                <div style="font-weight: 600; font-size: 14px;">PRIORITY ALERT</div>
            </div>
            <div style="font-size: 13px; opacity: 0.9;">
                <strong>${authorName}</strong> in <strong>#${channelName}</strong>
                ${guild ? `<br><span style="opacity: 0.7;">${guildName}</span>` : ""}
            </div>
        `;

        if (!document.getElementById("notify-popup-style")) {
            const style = document.createElement("style");
            style.id = "notify-popup-style";
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 4000);
    } catch (error) {
        log("error", "Popup creation failed", error);
    }
}

function triggerAlert(message: any) {
    try {
        stats.alertsTriggered++;
        stats.lastAlert = new Date().toLocaleString();
        stats.status = "Processing Alert";

        const { alertType, soundType, customSoundUrl, volume } = settings.store;

        if (alertType === "sound" || alertType === "all") {
            if (soundType === "custom" && customSoundUrl) {
                playCustomSound(customSoundUrl, volume);
            } else {
                generateSound(soundType || "urgent", volume);
            }
        }

        if (alertType === "flash" || alertType === "all") {
            createFlash();
        }

        if (alertType === "popup" || alertType === "all") {
            createPopup(message);
        }

        setTimeout(() => {
            stats.status = "Active";
        }, 2000);

        log("info", "Priority alert triggered successfully");
    } catch (error) {
        log("error", "Alert trigger failed", error);
        stats.status = "Error";
    }
}

function handleMessage(data: any) {
    try {
        stats.messagesProcessed++;

        if (!data?.message) return;

        const message = data.message;
        const currentUserId = UserStore.getCurrentUser()?.id;
        
        if (message.author?.id === currentUserId) return;

        const priorityChannels = settings.store.priorityChannels
            .split(",")
            .map(id => id.trim())
            .filter(id => id.length > 0);

        if (priorityChannels.length === 0) return;

        if (priorityChannels.includes(message.channel_id)) {
            log("info", `Priority message detected in channel: ${message.channel_id}`);
            triggerAlert(message);
        }
    } catch (error) {
        log("error", "Message handler error", error);
        stats.status = "Handler Error";
    }
}

export default definePlugin({
    name: "notifyPlus",
    description: "Priority alerts for specific channels with customizable sounds, flash effects and popups",
    authors: [Devs.fax2109],
    settings,

    flux: {
        MESSAGE_CREATE: handleMessage
    },

    start() {
        try {
            log("info", "Starting notifyPlus...");

            stats = {
                started: new Date().toISOString(),
                messagesProcessed: 0,
                alertsTriggered: 0,
                lastAlert: null,
                status: "Active"
            };

            log("info", "notifyPlus started successfully");
            setTimeout(showStats, 2000);
        } catch (error) {
            log("error", "Plugin start failed", error);
            stats.status = "Start Failed";
        }
    },

    stop() {
        try {
            log("info", "Stopping notifyPlus...");
            stats.status = "Stopped";
            showStats();
            log("info", "notifyPlus stopped successfully");
        } catch (error) {
            log("error", "Plugin stop failed", error);
        }
    }
});