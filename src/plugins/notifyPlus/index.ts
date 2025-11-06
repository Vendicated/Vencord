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
    textFiltersTriggered: number;
}

interface TextFilter {
    keyword: string;
    soundType: string;
    customUrl?: string;
    caseSensitive: boolean;
    wholeWord: boolean;
}

let stats: PluginStats = {
    started: new Date().toISOString(),
    messagesProcessed: 0,
    alertsTriggered: 0,
    lastAlert: null,
    status: "Active",
    textFiltersTriggered: 0
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
        description: "Custom sound URL (for priority channels when not using text filters)",
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
    },
    enableTextFilters: {
        type: OptionType.BOOLEAN,
        description: "Enable text-based sound filters",
        default: false
    },
    textFilters: {
        type: OptionType.STRING,
        description: "Text filters - Format: keyword:audio_url,keyword:audio_url (e.g., urgent:https://example.com/urgent.mp3,help:https://example.com/help.wav)",
        default: "urgent:https://cdn.discordapp.com/attachments/123456789/urgent.mp3,emergency:https://cdn.discordapp.com/attachments/123456789/emergency.wav",
        placeholder: "urgent:https://example.com/urgent.mp3,help:https://example.com/help.wav"
    },
    textFilterPriority: {
        type: OptionType.SELECT,
        description: "Text filter priority over channel alerts",
        options: [
            { label: "Channel priority (text filters only in priority channels)", value: "channel" },
            { label: "Text priority (text filters work in any channel)", value: "text" },
            { label: "Both (text filters work everywhere, priority channels use default sound)", value: "both" }
        ],
        default: "channel"
    },
    advancedTextFilters: {
        type: OptionType.BOOLEAN,
        description: "Enable advanced text filter options (case sensitivity, whole word matching)",
        default: false
    },
    textFilterCaseSensitive: {
        type: OptionType.BOOLEAN,
        description: "Make text filters case sensitive",
        default: false
    },
    textFilterWholeWord: {
        type: OptionType.BOOLEAN,
        description: "Match whole words only",
        default: false
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
│ Text filters triggered: ${stats.textFiltersTriggered}
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
        log("info", `Playing custom sound from: ${url}`);
        
        const audio = new Audio(url);
        audio.volume = volume / 100;
        
        audio.onerror = (error) => {
            log("warn", `Custom sound failed to load: ${url}`, error);
            generateSound("urgent", volume);
        };
        
        audio.play().catch((error) => {
            log("warn", `Custom sound failed to play: ${url}`, error);
            generateSound("urgent", volume);
        });
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

function parseTextFilters(): TextFilter[] {
    try {
        if (!settings.store.enableTextFilters || !settings.store.textFilters) {
            return [];
        }
        
        const filtersString = settings.store.textFilters.trim();
        
        // Handle legacy JSON format for backward compatibility
        if (filtersString.startsWith('[')) {
            try {
                const filters = JSON.parse(filtersString);
                if (!Array.isArray(filters)) {
                    log("warn", "Text filters must be an array");
                    return [];
                }
                
                return filters.filter((filter: any) => {
                    if (typeof filter !== 'object' || !filter.keyword || !filter.soundType) {
                        log("warn", "Invalid text filter format", filter);
                        return false;
                    }
                    return true;
                });
            } catch (error) {
                log("error", "Failed to parse legacy JSON text filters", error);
                return [];
            }
        }
        
        // Parse new URL format: keyword:url,keyword:url
        const filterPairs = filtersString.split(',').map(pair => pair.trim()).filter(pair => pair);
        const parsedFilters: TextFilter[] = [];
        
        for (const pair of filterPairs) {
            const colonIndex = pair.indexOf(':');
            if (colonIndex === -1) {
                log("warn", `Invalid filter format: "${pair}". Expected format: keyword:url`);
                continue;
            }
            
            const keyword = pair.substring(0, colonIndex).trim();
            const url = pair.substring(colonIndex + 1).trim();
            
            if (!keyword || !url) {
                log("warn", `Invalid filter format: "${pair}". Both keyword and URL are required`);
                continue;
            }
            
            // Validate URL format
            try {
                new URL(url);
            } catch {
                log("warn", `Invalid URL in filter "${pair}": ${url}`);
                continue;
            }
            
            parsedFilters.push({
                keyword: keyword,
                soundType: "custom", // Always custom for URL-based filters
                customUrl: url,
                caseSensitive: settings.store.advancedTextFilters ? settings.store.textFilterCaseSensitive : false,
                wholeWord: settings.store.advancedTextFilters ? settings.store.textFilterWholeWord : false
            });
        }
        
        if (parsedFilters.length > 0) {
            log("info", `Loaded ${parsedFilters.length} text filters`);
        }
        
        return parsedFilters;
    } catch (error) {
        log("error", "Failed to parse text filters", error);
        return [];
    }
}

function checkTextFilters(content: string): TextFilter | null {
    const filters = parseTextFilters();
    if (filters.length === 0) {
        log("info", "No text filters configured");
        return null;
    }
    
    log("info", `Checking ${filters.length} text filters against content: "${content}"`);
    
    for (const filter of filters) {
        let searchText = filter.caseSensitive ? content : content.toLowerCase();
        let keyword = filter.caseSensitive ? filter.keyword : filter.keyword.toLowerCase();
        
        log("info", `Testing filter "${keyword}" (caseSensitive: ${filter.caseSensitive}, wholeWord: ${filter.wholeWord}) against "${searchText}"`);
        
        let found = false;
        if (filter.wholeWord) {
            // Match whole words only
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            found = regex.test(searchText);
            log("info", `Whole word regex test: ${found}`);
        } else {
            // Match anywhere in text
            found = searchText.includes(keyword);
            log("info", `Substring test: ${found}`);
        }
        
        if (found) {
            log("info", `Text filter MATCHED: "${filter.keyword}" -> ${filter.soundType || 'custom URL'}`);
            return filter;
        }
    }
    
    log("info", "No text filters matched");
    return null;
}

function createPopup(message: any, filterInfo?: { type: string; keyword?: string }) {
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

        const alertTitle = filterInfo?.type === 'text' ? 'TEXT FILTER ALERT' : 'PRIORITY ALERT';
        const alertIcon = filterInfo?.type === 'text' ? '🎯' : '🚨';
        const keywordInfo = filterInfo?.keyword ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Keyword: "${filterInfo.keyword}"</div>` : '';
        
        popup.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div style="font-size: 18px;">${alertIcon}</div>
                <div style="font-weight: 600; font-size: 14px;">${alertTitle}</div>
            </div>
            <div style="font-size: 13px; opacity: 0.9;">
                <strong>${authorName}</strong> in <strong>#${channelName}</strong>
                ${guild ? `<br><span style="opacity: 0.7;">${guildName}</span>` : ""}
                ${keywordInfo}
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

function triggerAlert(message: any, textFilter?: TextFilter) {
    try {
        stats.alertsTriggered++;
        stats.lastAlert = new Date().toLocaleString();
        stats.status = "Processing Alert";

        const { alertType, soundType, customSoundUrl, volume } = settings.store;
        
        // Use text filter sound if available, otherwise use default settings
        const effectiveSoundType = textFilter?.soundType || soundType;
        const effectiveCustomUrl = textFilter?.customUrl || customSoundUrl;
        const isTextFilter = !!textFilter;
        
        if (isTextFilter) {
            stats.textFiltersTriggered++;
            log("info", `Using text filter: "${textFilter.keyword}" with ${textFilter.customUrl ? 'custom URL' : 'sound type'}: ${effectiveSoundType}`);
        }

        if (alertType === "sound" || alertType === "all") {
            if (effectiveSoundType === "custom" && effectiveCustomUrl) {
                // Use custom URL from text filter or global setting
                playCustomSound(effectiveCustomUrl, volume);
            } else {
                generateSound(effectiveSoundType || "urgent", volume);
            }
        }

        if (alertType === "flash" || alertType === "all") {
            createFlash();
        }

        if (alertType === "popup" || alertType === "all") {
            createPopup(message, textFilter ? { type: 'text', keyword: textFilter.keyword } : { type: 'priority' });
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

        const isPriorityChannel = priorityChannels.length > 0 && priorityChannels.includes(message.channel_id);
        const textFilterPriority = settings.store.textFilterPriority;
        
        // Check for text filters
        const messageContent = message.content || "";
        log("info", `Processing message: "${messageContent}" in channel ${message.channel_id}`);
        const textFilter = settings.store.enableTextFilters ? checkTextFilters(messageContent) : null;
        
        let shouldTriggerAlert = false;
        let alertTextFilter: TextFilter | undefined = undefined;
        
        // Determine if we should trigger an alert based on priority settings
        if (textFilterPriority === "text" && textFilter) {
            // Text filters work everywhere
            shouldTriggerAlert = true;
            alertTextFilter = textFilter;
            log("info", `Text filter triggered globally: "${textFilter.keyword}" in channel ${message.channel_id}`);
        } else if (textFilterPriority === "both") {
            // Text filters work everywhere AND priority channels always notify
            if (textFilter) {
                // Text filter found - use it regardless of channel
                shouldTriggerAlert = true;
                alertTextFilter = textFilter;
                log("info", `Text filter triggered: "${textFilter.keyword}" in channel ${message.channel_id} ${isPriorityChannel ? '(priority channel)' : '(regular channel)'}`);
            } else if (isPriorityChannel) {
                // No text filter but it's a priority channel - use default sound
                shouldTriggerAlert = true;
                log("info", `Priority channel message (default sound): ${message.channel_id}`);
            }
        } else if (textFilterPriority === "channel" || !textFilterPriority) {
            // Default behavior: text filters only work in priority channels
            if (isPriorityChannel) {
                shouldTriggerAlert = true;
                if (textFilter) {
                    alertTextFilter = textFilter;
                    log("info", `Text filter triggered in priority channel: "${textFilter.keyword}" in ${message.channel_id}`);
                } else {
                    log("info", `Priority channel message (default sound): ${message.channel_id}`);
                }
            }
        }
        
        if (shouldTriggerAlert) {
            triggerAlert(message, alertTextFilter);
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
                status: "Active",
                textFiltersTriggered: 0
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