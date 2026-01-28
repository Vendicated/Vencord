/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./index.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { isPluginEnabled, plugins } from "@api/PluginManager";
import { definePluginSettings, Settings, SettingsStore } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { openPluginModal } from "@components/settings";
import { Logger } from "@utils/Logger";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, Button, ChannelStore, ContextMenuApi, GuildStore, Menu, PermissionsBits, PermissionStore, React, ScrollerThin, SelectedChannelStore, showToast, Text, Toasts, Tooltip, UserStore, useState } from "@webpack/common";
import type { ReactNode } from "react";

// CSS animations for smooth transitions and effects
const animationStyles = `
@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pulse {
    0%, 100% {
        opacity: 0.7;
    }

    50% {
        opacity: 1;
    }
}

@keyframes slide-in {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes shimmer {
    0% {
        background-position: -200px 0;
    }
    100% {
        background-position: calc(200px + 100%) 0;
    }
}

/* Modal animations */
.vc-modal-root {
    animation: scaleIn 0.3s ease-out;
}

.vc-modal-header {
    animation: slideIn 0.4s ease-out;
}
`;

// CSS injection will be handled in the plugin start method to avoid loading issues

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
}

interface LogEntry {
    timestamp: number;
    userId: string;
    username: string;
    globalName?: string;
    channelId: string;
    channelName: string;
    guildId?: string;
    guildName?: string;
    action: "join" | "leave";
    sessionDuration?: number; // Duration in milliseconds for leave events
    loggedBecauseIJoined?: boolean; // True if this user was logged because you joined their channel
    // Persistent user data for post-restart display
    userAvatar?: string; // Avatar hash for persistent avatar display
    userAvatarUrl?: string; // Full avatar URL as fallback
    userDiscriminator?: string; // User discriminator if available
    // Additional persistent user data for @mentions
    userData?: {
        id: string;
        username: string;
        globalName?: string;
        avatar?: string;
        discriminator?: string;
    };
}

// Lazy-loaded Discord components and stores with error handling
// These might fail if Discord updates change module signatures
let VoiceStateStore: any;
let UserMentionComponent: any;
let HeaderBarIcon: any;
let ChannelActions: any;
let VoiceChannelIndicator: any = null;

try {
    VoiceStateStore = findByPropsLazy("getVoiceStatesForChannel", "getCurrentClientVoiceChannelId");
} catch (error) {
    console.warn("VoiceChannelLogger: Failed to find VoiceStateStore", error);
}

try {
    ChannelActions = findByPropsLazy("disconnect", "selectVoiceChannel");
} catch (error) {
    console.warn("VoiceChannelLogger: Failed to find ChannelActions", error);
}

try {
    UserMentionComponent = findComponentByCodeLazy(".USER_MENTION)");
} catch (error) {
    console.warn("VoiceChannelLogger: Failed to find UserMentionComponent", error);
    // Try alternative patterns for UserMentionComponent
    try {
        UserMentionComponent = findComponentByCodeLazy("USER_MENTION");
    } catch (error2) {
        try {
            UserMentionComponent = findComponentByCodeLazy("@");
        } catch (error3) {
            console.warn("VoiceChannelLogger: All UserMentionComponent patterns failed, setting to null");
            // Set to null instead of fallback span to force custom implementation
            UserMentionComponent = null;
        }
    }
}

try {
    HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '"aria-haspopup":');
} catch (error) {
    console.warn("VoiceChannelLogger: Failed to find HeaderBarIcon", error);
    // Fallback to a simple button
    HeaderBarIcon = ({ onClick, tooltip, icon, className }: any) => {
        return React.createElement("button", {
            onClick,
            title: tooltip,
            className: className || "vc-voice-logger-btn",
            style: { background: "none", border: "none", cursor: "pointer" }
        }, icon());
    };
}

// Lazy-load UserVoiceShow component (optional dependency)
// This will be initialized in the plugin's start() method
async function loadUserVoiceShowComponent() {
    if (VoiceChannelIndicator !== null) return; // Already loaded

    try {
        const userVoiceShowModule = await import("@plugins/userVoiceShow/components");
        VoiceChannelIndicator = userVoiceShowModule.VoiceChannelIndicator;
    } catch (error) {
        // UserVoiceShow plugin not installed, VoiceChannelIndicator will remain null
        // This is expected and handled gracefully in the rendering code
    }
}

// Logger instance with descriptive color for console output
const logger = new Logger("VoiceChannelLoggerMinimal", "#7289da");

// Storage and styling constants
const LOG_KEY = "VoiceChannelLogger_logs";
const cl = classNameFactory("vc-vcl-modal-");

// Simple event emitter for real-time log updates
class LogUpdateEmitter {
    private listeners: Set<() => void> = new Set();

    subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        // Return unsubscribe function
        return () => this.listeners.delete(callback);
    }

    emit(): void {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                logger.error("Error in log update listener:", error);
            }
        });
    }
}

const logUpdateEmitter = new LogUpdateEmitter();

// Timing constants (milliseconds)
const TOAST_SUPPRESSION_DURATION = 2000; // Standard suppression for channel switches
const INITIALIZATION_SUPPRESSION_DURATION = 5000; // Extended suppression during Discord startup

// Plugin state management
let lastUserChannelId: string | null = null; // Current user's voice channel for context tracking
let suppressToastsUntil: number = 0; // Timestamp for toast suppression expiration
let pluginInitialized: boolean = false; // Plugin initialization status flag
let initializationSuppressUntil: number = 0; // Timestamp for init suppression period end
let initializationStartTime: number = 0; // Timestamp when initialization began
const processedUsersDuringInit: Set<string> = new Set(); // Users already processed during startup
const userSessions: Map<string, number> = new Map(); // Maps userId → joinTimestamp for duration tracking

// Robust User Data Cache System - Prevents username visibility issues after Discord restarts
interface CachedUserData {
    id: string;
    username: string;
    globalName?: string;
    avatar?: string;
    discriminator?: string;
    lastUpdated: number;
    lastSeen: number;
}

const userDataCache: Map<string, CachedUserData> = new Map(); // In-memory user cache
const USER_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const USER_CACHE_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Enhanced user data retrieval with robust fallback mechanisms
async function getEnhancedUserData(userId: string): Promise<CachedUserData> {
    // Try to get fresh data from Discord's UserStore first
    const freshUser = UserStore.getUser(userId);

    if (freshUser) {
        // Update cache with fresh data
        const userData: CachedUserData = {
            id: freshUser.id,
            username: freshUser.username,
            globalName: freshUser.globalName,
            avatar: freshUser.avatar,
            discriminator: freshUser.discriminator,
            lastUpdated: Date.now(),
            lastSeen: Date.now()
        };
        userDataCache.set(userId, userData);
        return userData;
    }

    // Fallback to cached data if available
    const cachedUser = userDataCache.get(userId);
    if (cachedUser) {
        // Update last seen timestamp
        cachedUser.lastSeen = Date.now();
        return cachedUser;
    }

    // Check if we have user data from previous log entries
    const storedLogs = await DataStore.get(LOG_KEY) as LogEntry[] || [];
    const existingLogEntry = storedLogs.find(log => log.userId === userId && log.userData);
    if (existingLogEntry?.userData) {
        const userData: CachedUserData = {
            id: existingLogEntry.userData.id,
            username: existingLogEntry.userData.username,
            globalName: existingLogEntry.userData.globalName,
            avatar: existingLogEntry.userData.avatar,
            discriminator: existingLogEntry.userData.discriminator,
            lastUpdated: existingLogEntry.timestamp,
            lastSeen: Date.now()
        };
        userDataCache.set(userId, userData);
        return userData;
    }

    // Final fallback - create minimal user data
    const fallbackUser: CachedUserData = {
        id: userId,
        username: `User_${userId.slice(-4)}`,
        globalName: undefined,
        avatar: undefined,
        discriminator: undefined,
        lastUpdated: Date.now(),
        lastSeen: Date.now()
    };
    userDataCache.set(userId, fallbackUser);
    return fallbackUser;
}

// Synchronous version for React components - returns cached data immediately
function getEnhancedUserDataSync(userId: string): CachedUserData {
    // Try to get fresh data from Discord's UserStore first
    const freshUser = UserStore.getUser(userId);

    if (freshUser) {
        // Update cache with fresh data
        const userData: CachedUserData = {
            id: freshUser.id,
            username: freshUser.username,
            globalName: freshUser.globalName,
            avatar: freshUser.avatar,
            discriminator: freshUser.discriminator,
            lastUpdated: Date.now(),
            lastSeen: Date.now()
        };
        userDataCache.set(userId, userData);
        return userData;
    }

    // Fallback to cached data if available
    const cachedUser = userDataCache.get(userId);
    if (cachedUser) {
        // Update last seen timestamp
        cachedUser.lastSeen = Date.now();
        return cachedUser;
    }

    // Final fallback - create minimal user data
    const fallbackUser: CachedUserData = {
        id: userId,
        username: `User_${userId.slice(-4)}`,
        globalName: undefined,
        avatar: undefined,
        discriminator: undefined,
        lastUpdated: Date.now(),
        lastSeen: Date.now()
    };
    userDataCache.set(userId, fallbackUser);
    return fallbackUser;
}

// Proactive user data refresh for better cache maintenance
async function refreshUserDataCache() {
    const now = Date.now();
    const usersToRefresh: string[] = [];

    // Find users that need refreshing
    for (const [userId, userData] of userDataCache.entries()) {
        if (now - userData.lastUpdated > USER_CACHE_REFRESH_INTERVAL) {
            usersToRefresh.push(userId);
        }
    }

    // Refresh user data in batches to avoid overwhelming Discord's API
    for (const userId of usersToRefresh) {
        try {
            const freshUser = UserStore.getUser(userId);
            if (freshUser) {
                const userData: CachedUserData = {
                    id: freshUser.id,
                    username: freshUser.username,
                    globalName: freshUser.globalName,
                    avatar: freshUser.avatar,
                    discriminator: freshUser.discriminator,
                    lastUpdated: now,
                    lastSeen: userDataCache.get(userId)?.lastSeen || now
                };
                userDataCache.set(userId, userData);
            }
        } catch (error) {
            console.warn(`VoiceChannelLogger: Failed to refresh user data for ${userId}:`, error);
        }

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Clean up expired cache entries
function cleanupUserCache() {
    const now = Date.now();
    const expiredUsers: string[] = [];

    for (const [userId, userData] of userDataCache.entries()) {
        if (now - userData.lastSeen > USER_CACHE_EXPIRY) {
            expiredUsers.push(userId);
        }
    }

    for (const userId of expiredUsers) {
        userDataCache.delete(userId);
    }
}

// Plugin settings organized by functional categories for easier navigation and management
const settings = definePluginSettings({
    // Core Logging Behavior
    enableFileLogging: {
        type: OptionType.BOOLEAN,
        description: "Save voice channel logs to persistent storage",
        default: true,
    },
    trackSessionDuration: {
        type: OptionType.BOOLEAN,
        description: "Track how long users stay in voice channels",
        default: true,
    },
    maxLogEntries: {
        type: OptionType.NUMBER,
        description: "Maximum number of log entries to keep (0 = unlimited)",
        default: 1000,
    },

    // Filtering Options
    logOwnActions: {
        type: OptionType.BOOLEAN,
        description: "Log your own voice channel actions",
        default: false,
    },

    // Notification Settings
    showToastNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show toast notifications when users join/leave",
        default: true,
    },
    suppressToastsForExistingUsers: {
        type: OptionType.BOOLEAN,
        description: "Don't show toasts for users already in channel (when joining or on Discord restart)",
        default: true,
    },
    toastDuration: {
        type: OptionType.NUMBER,
        description: "Toast notification duration in seconds",
        default: 3,
    },

    // UI & Display Settings
    logsPerPage: {
        type: OptionType.NUMBER,
        description: "Number of logs to display per page (lower = better performance)",
        default: 50,
    },
    colorStatisticsByFilter: {
        type: OptionType.BOOLEAN,
        description: "Color statistics based on the active filter (green for joins, red for leaves)",
        default: false,
    },

    // Debug Options
    enableDebugLogging: {
        type: OptionType.BOOLEAN,
        description: "Enable basic console logging (reduces console spam compared to detailed debug mode)",
        default: false,
    }
});

// ===== Utility Functions =====

/**
 * Formats timestamp to localized date/time string
 */
function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
}

/**
 * Formats timestamp to relative time string (e.g., "2 hours ago", "yesterday")
 */
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (weeks === 1) return "a week ago";
    if (weeks < 4) return `${weeks} weeks ago`;
    if (months === 1) return "a month ago";
    if (months < 12) return `${months} months ago`;
    if (years === 1) return "a year ago";
    return `${years} years ago`;
}

/**
 * Returns color for action type (join/leave) using Discord's color scheme
 */
function getActionColor(action: string): string {
    switch (action) {
        case "join": return "#43b581"; // Discord green
        case "leave": return "#f04747"; // Discord red
        default: return "#99aab5"; // Discord gray
    }
}

/**
 * Returns emoji icon for voice action type
 */
function getActionIcon(action: string): string {
    switch (action) {
        case "join": return "✅"; // Check mark
        case "leave": return "❌"; // X mark
        default: return "📝"; // Note
    }
}

/**
 * Saves log entry to persistent storage with FIFO cleanup
 */
async function saveLogEntry(entry: LogEntry) {
    // Skip if file logging is disabled
    if (!settings.store.enableFileLogging) return;

    try {
        // Update logs with DataStore's atomic update method
        await DataStore.update(LOG_KEY, (logs: LogEntry[] = []) => {
            // Add new entry at beginning (most recent first)
            logs.unshift(entry);

            // Enforce max entry limit with FIFO cleanup
            const maxEntries = settings.store.maxLogEntries;
            if (maxEntries > 0 && logs.length > maxEntries) {
                logs.length = maxEntries; // Truncate oldest entries
            }

            return logs;
        });

        // Emit event to notify subscribers (e.g., open modals) that logs have been updated
        logUpdateEmitter.emit();
    } catch (error) {
        logger.error("Failed to save log entry:", error);
    }
}

/**
 * Formats log entry into human-readable console message
 */
function formatLogMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const displayName = entry.globalName || entry.username;
    const guild = entry.guildName ? ` in ${entry.guildName}` : "";

    // Add session duration for leave events
    let sessionInfo = "";
    if (entry.sessionDuration && entry.action === "leave") {
        const duration = formatDuration(entry.sessionDuration);
        sessionInfo = ` (session: ${duration})`;
    }

    // Format message based on action type
    const joinReason = entry.loggedBecauseIJoined ? " (logged because you joined)" : "";
    switch (entry.action) {
        case "join":
            return `[${timestamp}] ${displayName} (${entry.userId}) joined voice channel "${entry.channelName}"${guild}${joinReason}`;
        case "leave":
            return `[${timestamp}] ${displayName} (${entry.userId}) left voice channel "${entry.channelName}"${guild}${sessionInfo}`;
        default:
            return `[${timestamp}] ${displayName} (${entry.userId}) - ${entry.action} in "${entry.channelName}"${guild}`;
    }
}

/**
 * Converts milliseconds to readable duration string (e.g., "2h 15m 30s")
 */
function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    // Show hours, minutes, seconds format based on duration
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    // Show only seconds for short durations
    else {
        return `${seconds}s`;
    }
}

/**
 * Logs all users already in a channel when the current user joins that channel
 * This creates entries indicating these users were logged because you joined them
 * @param channelId - The channel ID to get users from
 * @param currentUserId - The current user's ID to exclude from logging
 * @param suppressToast - Whether to suppress toast notifications
 */
async function logUsersAlreadyInChannel(channelId: string, currentUserId: string, suppressToast: boolean = false) {
    if (!channelId || !VoiceStateStore) return;

    try {
        // Get all voice states for the channel
        const voiceStates = VoiceStateStore.getVoiceStatesForChannel?.(channelId);
        if (!voiceStates) return;

        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return;

        const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;

        // Process each user already in the channel
        for (const userId of Object.keys(voiceStates)) {
            // Skip the current user
            if (userId === currentUserId) continue;

            try {
                const user = await getEnhancedUserData(userId);
                const discordUser = UserStore.getUser(userId);

                // Get avatar information
                let userAvatar: string | undefined;
                let userAvatarUrl: string | undefined;
                let userDiscriminator: string | undefined;

                if (discordUser && typeof discordUser === "object") {
                    userAvatar = discordUser.avatar;
                    userDiscriminator = discordUser.discriminator;
                    if (discordUser.getAvatarURL && typeof discordUser.getAvatarURL === "function") {
                        try {
                            userAvatarUrl = discordUser.getAvatarURL(undefined, 32);
                        } catch (error) {
                            if (userAvatar) {
                                userAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${userAvatar}.png?size=32`;
                            }
                        }
                    } else if (userAvatar) {
                        userAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${userAvatar}.png?size=32`;
                    }
                }

                // Track session start time for these users
                if (settings.store.trackSessionDuration) {
                    userSessions.set(userId, Date.now());
                }

                const logEntry: LogEntry = {
                    timestamp: Date.now(),
                    userId: user.id,
                    username: user.username,
                    globalName: user.globalName,
                    channelId: channelId,
                    channelName: channel.name || "Unknown Channel",
                    guildId: channel.guild_id,
                    guildName: guild?.name,
                    action: "join",
                    loggedBecauseIJoined: true, // Mark that this user was logged because you joined
                    userAvatar: userAvatar,
                    userAvatarUrl: userAvatarUrl,
                    userDiscriminator: userDiscriminator,
                    userData: {
                        id: user.id,
                        username: user.username,
                        globalName: user.globalName,
                        avatar: userAvatar,
                        discriminator: userDiscriminator
                    }
                };

                logVoiceEvent(logEntry, suppressToast);
            } catch (error) {
                logger.error(`Error logging user ${userId} already in channel:`, error);
            }
        }
    } catch (error) {
        logger.error("Error logging users already in channel:", error);
    }
}

/**
 * Processes a voice channel event by logging, saving, and optionally showing notifications
 * Central hub for all voice event processing with configurable output methods
 * @param entry - The log entry containing all event data
 * @param suppressToast - Whether to skip showing toast notification (for initialization/spam prevention)
 */
function logVoiceEvent(entry: LogEntry, suppressToast: boolean = false) {
    // Console logging only when debug mode is enabled to reduce spam
    // Provides essential info for troubleshooting without overwhelming output
    if (settings.store.enableDebugLogging) {
        const displayName = entry.globalName || entry.username;
        const actionText = entry.action === "join" ? "joined" : "left";
        logger.info(`${displayName} ${actionText} ${entry.channelName}`);
    }

    // Save to persistent storage if file logging is enabled
    if (settings.store.enableFileLogging) {
        saveLogEntry(entry);
    }

    // Show toast notification unless suppressed or disabled in settings
    // Suppression is used during initialization and channel switches to prevent spam
    if (settings.store.showToastNotifications && !suppressToast) {
        showToastNotification(entry);
    }
}

/**
 * Displays a toast notification for voice channel events
 * Uses different toast types and colors based on action (join = green, leave = neutral)
 * @param entry - The log entry to create a notification for
 */
function showToastNotification(entry: LogEntry) {
    const displayName = entry.globalName || entry.username;
    const actionText = entry.action === "join" ? "joined" : "left";
    const location = entry.guildName ? ` in ${entry.guildName}` : ""; // Add guild context if available
    const joinReason = entry.loggedBecauseIJoined ? " (logged because you joined)" : "";

    // Construct user-friendly message
    const toastMessage = `${displayName} ${actionText} ${entry.channelName}${location}${joinReason}`;

    // Use success type (green) for joins, message type (neutral) for leaves
    const toastType = entry.action === "join" ? Toasts.Type.SUCCESS : Toasts.Type.MESSAGE;

    // Show toast with user-configured duration
    showToast(toastMessage, toastType, {
        duration: settings.store.toastDuration * 1000 // Convert seconds to milliseconds
    });
}

/**
 * Determines the type of voice channel action from a voice state update
 * Analyzes current and previous channel IDs to detect joins and leaves
 * @param state - Discord voice state object containing channel information
 * @returns Action type or null if no relevant action detected
 */
function getActionType(state: VoiceState): "join" | "leave" | null {
    const { channelId, oldChannelId } = state;

    // User joined a channel (new channel, no previous channel)
    if (channelId && !oldChannelId) return "join";

    // User left a channel (no current channel, had previous channel)
    if (!channelId && oldChannelId) return "leave";

    // Channel switch or no change - not logged as separate join/leave
    return null;
}

/**
 * Minimal log entry row component with clean design
 * Displays user avatar, name, action indicator, channel info, and session duration
 * Uses persistent avatar data and Discord's UserMentionComponent for native interactions
 * Includes robust fallback click handlers for user profile access
 */
function LogEntryRow({ log, onCloseModal, onFilterToUser, onSetSearchTerm, onHideSuggestions }: { log: LogEntry; onCloseModal?: () => void; onFilterToUser?: (userId: string | undefined) => void; onSetSearchTerm?: (searchTerm: string) => void; onHideSuggestions?: () => void; }) {
    // Get enhanced user data with robust fallback mechanisms
    const enhancedUser = getEnhancedUserDataSync(log.userId);
    const displayName = enhancedUser.globalName || enhancedUser.username;
    const location = log.guildName ? `${log.channelName} in ${log.guildName}` : log.channelName;

    // Enhanced user data handling with comprehensive fallback chain
    // Tries multiple sources to ensure avatar displays even after Discord restarts
    const user = UserStore.getUser(log.userId);

    // Avatar URL resolution with multiple fallback strategies
    let avatarUrl: string;
    // Priority 1: Current user data with avatar method
    if (user?.getAvatarURL) {
        avatarUrl = user.getAvatarURL(undefined, 32);
    }
    // Priority 2: Stored full avatar URL from when user was online
    else if (log.userAvatarUrl) {
        avatarUrl = log.userAvatarUrl;
    }
    // Priority 3: Construct from stored avatar hash
    else if (log.userAvatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${log.userId}/${log.userAvatar}.png?size=32`;
    }
    // Priority 4: User exists but getAvatarURL method might be missing
    else if (user?.avatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${log.userId}/${user.avatar}.png?size=32`;
    }
    // Final fallback: Default Discord avatar based on user ID
    else {
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(log.userId) % 5}.png`;
    }

    // Enhanced user click handler with multiple fallback strategies
    const handleUserClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Method 1: Try to dynamically import openUserProfile
            try {
                const { openUserProfile } = await import("@utils/discord");
                if (openUserProfile && typeof openUserProfile === "function") {
                    openUserProfile(log.userId);
                    return;
                }
            } catch (error) {
                console.warn("VoiceChannelLogger: openUserProfile not available", error);
            }

            // Method 2: Try to find and use openUserProfileModal
            try {
                const UserProfileModal = findByPropsLazy("openUserProfileModal");
                if (UserProfileModal?.openUserProfileModal) {
                    UserProfileModal.openUserProfileModal({ userId: log.userId });
                    return;
                }
            } catch (error) {
                console.warn("VoiceChannelLogger: openUserProfileModal not available", error);
            }

            // Method 3: Try to find profile modal through different patterns
            try {
                const ProfileUtils = findByPropsLazy("getUserProfile", "fetchProfile");
                if (ProfileUtils?.getUserProfile) {
                    ProfileUtils.getUserProfile(log.userId);
                    return;
                }
            } catch (error) {
                console.warn("VoiceChannelLogger: ProfileUtils not available", error);
            }

            // Final fallback: Copy user ID to clipboard with toast notification
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(log.userId);
                showToast("User ID copied to clipboard", Toasts.Type.SUCCESS);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement("textarea");
                textArea.value = log.userId;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
                showToast("User ID copied to clipboard", Toasts.Type.SUCCESS);
            }
        } catch (error) {
            console.error("VoiceChannelLogger: Error in handleUserClick", error);
            showToast("Failed to open user profile", Toasts.Type.FAILURE);
        }
    };

    // Enhanced user component renderer with proper Discord integration
    const renderUserComponent = () => {
        // Always use the fallback implementation to ensure consistent username display
        // This prevents usernames from becoming invisible after Discord restarts
        return (
            <span
                className="mention"
                onClick={handleUserClick}
                style={{
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer",
                    textDecoration: "none",
                    borderRadius: "3px",
                    padding: "0 2px",
                    backgroundColor: "rgba(88, 101, 242, 0.3)",
                    transition: "background-color 0.2s ease",
                    display: "inline-block",
                    minWidth: "20px" // Ensure minimum width so text is always visible
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "rgba(88, 101, 242, 0.5)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "rgba(88, 101, 242, 0.3)";
                }}
                title={`Click to open ${displayName}'s profile`}
            >
                @{displayName}
            </span>
        );
    };

    // Context menu handler for log entries
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if FollowUser plugin is enabled and get follow state
        const followUserEnabled = isPluginEnabled("FollowUser");
        const currentUserId = UserStore.getCurrentUser()?.id;

        // Safely access FollowUser settings
        let followUserId = "";
        let canShowFollow = false;
        if (followUserEnabled) {
            try {
                // Try accessing via Settings.plugins
                const followUserSettings = Settings.plugins?.FollowUser;
                if (followUserSettings) {
                    followUserId = followUserSettings.followUserId || "";
                    canShowFollow = log.userId !== currentUserId && log.userId !== undefined;
                } else {
                    // Plugin enabled but settings not initialized yet - still show menu item
                    canShowFollow = log.userId !== currentUserId && log.userId !== undefined;
                }
            } catch (error) {
                logger.warn("Failed to access FollowUser settings:", error);
                // Still show menu item even if settings access fails
                canShowFollow = log.userId !== currentUserId && log.userId !== undefined;
            }
        }

        const isFollowed = followUserEnabled && followUserId === log.userId;

        ContextMenuApi.openContextMenu(e, () =>
            <Menu.Menu
                navId="vc-voice-logs-entry-context"
                onClose={ContextMenuApi.closeContextMenu}
                aria-label="Log Entry Options"
            >
                <Menu.MenuItem
                    id="vc-voice-logs-view-user-logs"
                    label="Filter to User"
                    icon={VoiceLogsIcon}
                    action={() => {
                        // Filter current view to this user
                        if (onFilterToUser) {
                            onFilterToUser(log.userId);
                        }
                        // Set search term to user's name (like right-clicking in VC)
                        if (onSetSearchTerm) {
                            // Generate the suggestion value format (matches generateSuggestions logic)
                            const useGlobalName = log.globalName && (!log.username || log.globalName);
                            const suggestionValue = useGlobalName && log.globalName
                                ? log.globalName
                                : (log.username || log.userId);
                            onSetSearchTerm(suggestionValue);
                        }
                        // Hide suggestions (like right-clicking in VC)
                        if (onHideSuggestions) {
                            onHideSuggestions();
                        }
                    }}
                />
                {/* Follow User integration - only show if FollowUser plugin is enabled */}
                {canShowFollow && (
                    <Menu.MenuItem
                        id="vc-voice-logs-follow-user"
                        label={isFollowed ? "Unfollow User" : "Follow User"}
                        icon={isFollowed ? UnfollowIcon : FollowIcon}
                        action={() => {
                            try {
                                // Toggle follow state
                                if (isFollowed) {
                                    if (Settings.plugins?.FollowUser) {
                                        Settings.plugins.FollowUser.followUserId = "";
                                        SettingsStore.markAsChanged();
                                    }
                                    showToast("Stopped following user", Toasts.Type.SUCCESS);
                                } else {
                                    if (Settings.plugins?.FollowUser) {
                                        Settings.plugins.FollowUser.followUserId = log.userId;
                                        SettingsStore.markAsChanged();
                                    } else {
                                        // Initialize plugin settings if they don't exist
                                        if (!Settings.plugins.FollowUser) {
                                            Settings.plugins.FollowUser = { followUserId: log.userId } as any;
                                        } else {
                                            Settings.plugins.FollowUser.followUserId = log.userId;
                                        }
                                        SettingsStore.markAsChanged();
                                    }
                                    // Optionally trigger follow action if executeOnFollow is enabled
                                    const executeOnFollow = Settings.plugins?.FollowUser?.executeOnFollow ?? true;
                                    if (executeOnFollow && ChannelActions && VoiceStateStore) {
                                        // Get user's current channel (using same method as FollowUser plugin)
                                        let userChannelId: string | null = null;
                                        try {
                                            // Try the simpler method first (if available)
                                            if (VoiceStateStore.getVoiceStateForUser) {
                                                userChannelId = VoiceStateStore.getVoiceStateForUser(log.userId)?.channelId ?? null;
                                            } else {
                                                // Fallback to the more complex method
                                                const states = VoiceStateStore.getAllVoiceStates();
                                                for (const users of Object.values(states) as any[]) {
                                                    if (users && users[log.userId]) {
                                                        userChannelId = users[log.userId].channelId ?? null;
                                                        break;
                                                    }
                                                }
                                            }
                                        } catch (error) {
                                            logger.warn("Failed to get user's voice channel:", error);
                                        }
                                        if (userChannelId) {
                                            const myChanId = SelectedChannelStore.getVoiceChannelId();
                                            if (userChannelId !== myChanId) {
                                                const channel = ChannelStore.getChannel(userChannelId);
                                                if (channel) {
                                                    const voiceStates = VoiceStateStore.getVoiceStatesForChannel(userChannelId);
                                                    const memberCount = voiceStates ? Object.keys(voiceStates).length : null;
                                                    const CONNECT = 1n << 20n;
                                                    if (channel.type === 1 || PermissionStore.can(CONNECT, channel)) {
                                                        if (channel.userLimit !== 0 && memberCount !== null && memberCount >= channel.userLimit && !PermissionStore.can(PermissionsBits.MOVE_MEMBERS, channel)) {
                                                            showToast("Channel is full", Toasts.Type.FAILURE);
                                                            return;
                                                        }
                                                        ChannelActions.selectVoiceChannel(userChannelId);
                                                        showToast("Followed user into voice channel", Toasts.Type.SUCCESS);
                                                    } else {
                                                        showToast("Insufficient permissions to enter voice channel", Toasts.Type.FAILURE);
                                                    }
                                                }
                                            } else {
                                                showToast("You are already in the same channel", Toasts.Type.FAILURE);
                                            }
                                        } else {
                                            showToast("Followed user is not in a voice channel", Toasts.Type.FAILURE);
                                        }
                                    } else {
                                        showToast("Now following user", Toasts.Type.SUCCESS);
                                    }
                                }
                            } catch (error) {
                                logger.error("Failed to toggle follow user:", error);
                                showToast("Failed to toggle follow user", Toasts.Type.FAILURE);
                            }
                        }}
                    />
                )}
            </Menu.Menu>
        );
    };

    return (
        <div
            className={`vc-vcl-modal-log-entry ${log.loggedBecauseIJoined ? "vc-vcl-modal-action-joined" : ""}`}
            style={{
                borderLeft: log.loggedBecauseIJoined ? "3px solid #5865f2" : `3px solid ${getActionColor(log.action)}`
            }}
            onContextMenu={handleContextMenu}
        >
            {/* User Avatar */}
            <div
                className="vc-vcl-modal-log-entry-avatar"
                onClick={handleUserClick}
                title={`Click to open ${displayName}'s profile`}
            >
                <Avatar
                    src={avatarUrl}
                    size="SIZE_32"
                    aria-label={displayName}
                />
            </div>

            {/* Main Content Area */}
            <div className="vc-vcl-modal-log-entry-content">
                {/* User Info Row - Username and Action Badge */}
                <div className="vc-vcl-modal-log-entry-user-info">
                    {/* Username with @ prefix */}
                    {renderUserComponent()}

                    {/* Action badge */}
                    <span className={`vc-vcl-modal-log-entry-action-badge vc-vcl-modal-action-${log.action.toLowerCase()}`} style={{
                        backgroundColor: getActionColor(log.action)
                    }}>
                        {log.action.toUpperCase()}
                    </span>

                    {/* "You joined" badge for entries logged because you joined their channel */}
                    {log.loggedBecauseIJoined && (
                        <span className="vc-vcl-modal-log-entry-you-joined-badge" style={{
                            padding: "2px 6px",
                            backgroundColor: "var(--brand-experiment)",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "white",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px"
                        }}
                            title="This user was logged because you joined their channel"
                        >
                            You joined
                        </span>
                    )}

                    {/* Session duration for leave events */}
                    {log.sessionDuration && log.action === "leave" && (
                        <span style={{
                            color: "var(--text-brand)",
                            fontWeight: "500",
                            fontSize: "12px"
                        }}>
                            {formatDuration(log.sessionDuration)}
                        </span>
                    )}

                    {/* Voice channel indicator - shows icon if user is currently in VC (only if UserVoiceShow plugin is enabled) */}
                    {isPluginEnabled("UserVoiceShow") && VoiceChannelIndicator && (
                        <div
                            onClickCapture={e => {
                                // Capture phase fires before VoiceChannelIndicator's onClick
                                // Check if the click target is within the voice indicator
                                const target = e.target as HTMLElement;
                                if (target.closest("[role=\"button\"]") || target.getAttribute("role") === "button") {
                                    // Close modal immediately - closing won't interfere with navigation
                                    if (onCloseModal) {
                                        onCloseModal();
                                    }
                                }
                            }}
                            style={{ display: "inline-flex" }}
                        >
                            <VoiceChannelIndicator userId={log.userId} />
                        </div>
                    )}
                </div>

                {/* Channel Info Below Username */}
                <div className="vc-vcl-modal-log-entry-channel-info">
                    {location}
                </div>
            </div>

            {/* Timestamp on the Right */}
            <div className="vc-vcl-modal-log-entry-timestamp">
                <Tooltip text={formatTimestamp(log.timestamp)}>
                    {props => (
                        <span {...props}>
                            {formatRelativeTime(log.timestamp)}
                        </span>
                    )}
                </Tooltip>
            </div>
        </div>
    );
}

/**
 * Fuzzy search algorithm for typo-tolerant matching
 * Based on character sequence matching with scoring
 * @param searchQuery - The search term to match
 * @param searchString - The string to search in
 * @returns Score (positive number) if match found, null otherwise
 */
function fuzzySearch(searchQuery: string, searchString: string): number | null {
    if (!searchQuery || !searchString) return null;

    let searchIndex = 0;
    let score = 0;
    const queryLower = searchQuery.toLowerCase();
    const stringLower = searchString.toLowerCase();

    for (let i = 0; i < stringLower.length; i++) {
        if (stringLower[i] === queryLower[searchIndex]) {
            score++;
            searchIndex++;
        } else {
            score--;
        }

        if (searchIndex === queryLower.length) {
            return score;
        }
    }

    return null;
}

/**
 * Enhanced search function with fuzzy matching and extended scope
 * Searches across username, global name, user ID, and channel name
 * @param log - Log entry to check
 * @param searchTerm - Search string to match against
 * @returns Match score (0-100) for ranking, or null if no match
 */
function searchMatches(log: LogEntry, searchTerm: string): number | null {
    if (!searchTerm || !searchTerm.trim()) return 100; // Show all if no search term

    const term = searchTerm.toLowerCase().trim();

    // Safe string checking with null/undefined protection
    const username = (log.username || "").toLowerCase();
    const globalName = (log.globalName || "").toLowerCase();
    const userId = log.userId || "";
    const channelName = (log.channelName || "").toLowerCase();

    // Exact matches get highest score (100)
    if (username === term || globalName === term || userId === term || channelName === term) {
        return 100;
    }

    // User ID exact match (case-sensitive for IDs)
    if (userId === searchTerm.trim()) {
        return 100;
    }

    // Starts with gets high score (90)
    if (username.startsWith(term) || globalName.startsWith(term) || channelName.startsWith(term)) {
        return 90;
    }

    // Contains gets medium score (70)
    if (username.includes(term) || globalName.includes(term) || channelName.includes(term)) {
        return 70;
    }

    // Fuzzy matching - get best score from all fields
    let bestFuzzyScore: number | null = null;

    const usernameFuzzy = fuzzySearch(term, username);
    const globalNameFuzzy = fuzzySearch(term, globalName);
    const channelFuzzy = fuzzySearch(term, channelName);

    if (usernameFuzzy !== null && usernameFuzzy > 0) {
        bestFuzzyScore = Math.max(bestFuzzyScore || 0, Math.min(60, usernameFuzzy * 2));
    }
    if (globalNameFuzzy !== null && globalNameFuzzy > 0) {
        bestFuzzyScore = Math.max(bestFuzzyScore || 0, Math.min(60, globalNameFuzzy * 2));
    }
    if (channelFuzzy !== null && channelFuzzy > 0) {
        bestFuzzyScore = Math.max(bestFuzzyScore || 0, Math.min(60, channelFuzzy * 2));
    }

    return bestFuzzyScore;
}

/**
 * Minimal modal component for displaying voice channel logs with streamlined filtering
 * Features: clean filtering, search, pagination, and essential statistics
 * Uses React hooks for state management and focuses on information density
 */
function VoiceLogsModal({ modalProps, initialSearchTerm, initialUserId }: { modalProps: ModalProps; initialSearchTerm?: string; initialUserId?: string; }) {
    // State management for modal functionality
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "join" | "leave">("all");
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "");
    const [currentPage, setCurrentPage] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | undefined>(initialUserId);

    // Autocomplete suggestions state
    const [suggestions, setSuggestions] = useState<Array<{ type: "user" | "channel"; value: string; display: string; userId?: string; avatarUrl?: string; }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

    // Ref for the search input to enable auto-focus
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const suggestionsRef = React.useRef<HTMLDivElement>(null);
    const isSelectingSuggestionRef = React.useRef(false);
    const currentUserIdRef = React.useRef<string | undefined>(currentUserId);

    // Performance optimization: logs per page (configurable)
    const LOGS_PER_PAGE = Math.max(10, Math.min(settings.store.logsPerPage || 50, 200));

    /**
     * Loads voice channel logs from persistent storage
     * Handles loading state and error cases gracefully
     */
    const loadLogs = React.useCallback(async () => {
        try {
            setLoading(true);
            const storedLogs = await DataStore.get(LOG_KEY) as LogEntry[] || [];
            setLogs(storedLogs);
        } catch (error) {
            console.error("Failed to load voice logs:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load logs when component mounts
    React.useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Subscribe to real-time log updates
    React.useEffect(() => {
        const unsubscribe = logUpdateEmitter.subscribe(() => {
            // Reload logs when new entries are saved
            loadLogs();
        });

        // Cleanup subscription on unmount
        return unsubscribe;
    }, [loadLogs]);

    // Auto-apply user suggestion when opened from context menu
    React.useEffect(() => {
        if (initialUserId && logs.length > 0 && !initialSearchTerm) {
            // Find the user's log entry to get their username/globalName
            const userLog = logs.find(log => log.userId === initialUserId);
            if (userLog) {
                // Generate the suggestion value format (matches generateSuggestions logic)
                const useGlobalName = userLog.globalName && (!userLog.username || userLog.globalName);
                const suggestionValue = useGlobalName && userLog.globalName
                    ? userLog.globalName
                    : (userLog.username || userLog.userId);

                // Apply the suggestion (mimics clicking on autocomplete)
                isSelectingSuggestionRef.current = true;
                setSearchTerm(suggestionValue);
                setShowSuggestions(false);
            }
        }
    }, [logs, initialUserId, initialSearchTerm]);

    // Auto-focus the search input when modal opens
    React.useEffect(() => {
        if (searchInputRef.current) {
            // Small delay to ensure modal is fully rendered
            setTimeout(() => {
                searchInputRef.current?.focus();
                // If there's an initial search term, select it for easy editing
                if (initialSearchTerm) {
                    searchInputRef.current?.select();
                }
            }, 100);
        }
    }, [initialSearchTerm]);

    // Update ref when currentUserId changes
    React.useEffect(() => {
        currentUserIdRef.current = currentUserId;
    }, [currentUserId]);

    // Keyboard shortcuts handler
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if filtering by user first (using ref for synchronous access)
            if (e.key === "Escape" && currentUserIdRef.current) {
                // Clear user filter if active
                e.preventDefault();
                e.stopPropagation();
                setCurrentUserId(undefined);
                setSearchTerm(""); // Clear search term as well
                setCurrentPage(0);
                return;
            }

            // Don't handle shortcuts if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                // Allow Escape to close suggestions
                if (e.key === "Escape" && showSuggestions) {
                    setShowSuggestions(false);
                    setSelectedSuggestionIndex(-1);
                    return;
                }
                // Allow Ctrl+F / Cmd+F to focus search
                if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                    return;
                }
                // Allow Ctrl+K / Cmd+K to clear search
                if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                    e.preventDefault();
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                    return;
                }
                return;
            }

            // Global shortcuts (when not typing)
            switch (e.key) {
                case "Escape":
                    if (showSuggestions) {
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                    } else {
                        modalProps.onClose();
                    }
                    break;
                case "f":
                case "F":
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                    }
                    break;
                case "k":
                case "K":
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        setSearchTerm("");
                        searchInputRef.current?.focus();
                    }
                    break;
            }
        };

        // Use capture phase to intercept ESC before modal handles it
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [showSuggestions, modalProps]);


    /**
     * Log filtering function to filter logs by action type and search term
     * Filters logs by action type and search term, resets pagination when filters change
     * Now includes scoring for better result ranking
     */
    const filteredLogs = React.useMemo(() => {
        const filtered = logs
            .map(log => {
                // Filter by action type (all, join, leave)
                const matchesFilter = filter === "all" || log.action === filter;
                if (!matchesFilter) return null;

                // If filtering by specific user ID (from context menu), only show exact matches
                if (currentUserId && log.userId === currentUserId) {
                    return { log, score: 100 };
                }
                // If we have currentUserId but this log doesn't match, exclude it
                if (currentUserId && log.userId !== currentUserId) {
                    return null;
                }

                // Get search match score
                const searchScore = searchMatches(log, searchTerm);
                if (searchScore === null) return null;

                return { log, score: searchScore };
            })
            .filter((item): item is { log: LogEntry; score: number; } => item !== null)
            .sort((a, b) => b.score - a.score) // Sort by score descending (best matches first)
            .map(item => item.log);

        return filtered;
    }, [logs, filter, searchTerm, currentUserId]);

    // Reset to first page when filters change
    React.useEffect(() => {
        setCurrentPage(0);
    }, [filteredLogs.length]);

    /**
     * Generate autocomplete suggestions from logs
     * Extracts unique usernames, global names, user IDs, and channel names
     * Filters and ranks suggestions based on current search term
     */
    const generateSuggestions = React.useCallback((term: string, logEntries: LogEntry[]): Array<{ type: "user" | "channel"; value: string; display: string; userId?: string; avatarUrl?: string; }> => {
        if (!term || term.trim().length === 0) return [];

        const termLower = term.toLowerCase().trim();
        const suggestionsMap = new Map<string, { type: "user" | "channel"; value: string; display: string; score: number; userId?: string; avatarUrl?: string; }>();
        const userSuggestionsMap = new Map<string, { type: "user" | "channel"; value: string; display: string; score: number; userId?: string; avatarUrl?: string; }>();

        // Extract unique values from logs
        for (const log of logEntries) {
            // Helper function to get avatar URL
            const getAvatarUrl = (): string => {
                const user = UserStore.getUser(log.userId);
                if (user?.getAvatarURL) {
                    return user.getAvatarURL(undefined, 32);
                } else if (log.userAvatarUrl) {
                    return log.userAvatarUrl;
                } else if (log.userAvatar) {
                    return `https://cdn.discordapp.com/avatars/${log.userId}/${log.userAvatar}.png?size=32`;
                } else if (user?.avatar) {
                    return `https://cdn.discordapp.com/avatars/${log.userId}/${user.avatar}.png?size=32`;
                } else {
                    return `https://cdn.discordapp.com/embed/avatars/${parseInt(log.userId) % 5}.png`;
                }
            };

            // Check username match
            let usernameScore = 0;
            if (log.username) {
                const usernameLower = log.username.toLowerCase();
                if (usernameLower === termLower) usernameScore = 100;
                else if (usernameLower.startsWith(termLower)) usernameScore = 90;
                else if (usernameLower.includes(termLower)) usernameScore = 70;
                else {
                    const fuzzy = fuzzySearch(termLower, usernameLower);
                    if (fuzzy !== null && fuzzy > 0) usernameScore = Math.min(60, fuzzy * 2);
                }
            }

            // Check global name match
            let globalNameScore = 0;
            if (log.globalName) {
                const globalNameLower = log.globalName.toLowerCase();
                if (globalNameLower === termLower) globalNameScore = 100;
                else if (globalNameLower.startsWith(termLower)) globalNameScore = 90;
                else if (globalNameLower.includes(termLower)) globalNameScore = 70;
                else {
                    const fuzzy = fuzzySearch(termLower, globalNameLower);
                    if (fuzzy !== null && fuzzy > 0) globalNameScore = Math.min(60, fuzzy * 2);
                }
            }

            // Use the best match for this user (only one entry per userId)
            const bestScore = Math.max(usernameScore, globalNameScore);
            if (bestScore > 0) {
                const existing = userSuggestionsMap.get(log.userId);
                // Only add/update if this is a better match
                if (!existing || bestScore > existing.score) {
                    const avatarUrl = getAvatarUrl();
                    // Prefer global name display if both match, otherwise use the one that matched
                    const useGlobalName = globalNameScore >= usernameScore && log.globalName;
                    const value: string = useGlobalName && log.globalName
                        ? log.globalName
                        : (log.username || log.userId);
                    const display = log.globalName && log.username
                        ? `${log.globalName} (@${log.username})`
                        : (log.globalName || (log.username ? `@${log.username}` : `User ${log.userId.slice(-4)}`));

                    userSuggestionsMap.set(log.userId, {
                        type: "user",
                        value,
                        display,
                        userId: log.userId,
                        avatarUrl,
                        score: bestScore
                    });
                }
            }

            // User ID suggestions (exact match only for IDs)
            if (log.userId && log.userId.includes(term.trim())) {
                const userIdScore = log.userId === term.trim() ? 100 : 50;
                const existing = userSuggestionsMap.get(log.userId);
                // Only add/update if this is a better match than existing
                if (!existing || userIdScore > existing.score) {
                    const displayName = log.globalName || log.username || `User ${log.userId.slice(-4)}`;
                    const avatarUrl = getAvatarUrl();

                    userSuggestionsMap.set(log.userId, {
                        type: "user",
                        value: log.userId,
                        display: `${displayName} (${log.userId})`,
                        userId: log.userId,
                        avatarUrl,
                        score: userIdScore
                    });
                }
            }

            // Channel name suggestions
            if (log.channelName) {
                const channelLower = log.channelName.toLowerCase();
                if (!suggestionsMap.has(`channel:${log.channelName}`)) {
                    let score = 0;
                    if (channelLower === termLower) score = 100;
                    else if (channelLower.startsWith(termLower)) score = 90;
                    else if (channelLower.includes(termLower)) score = 70;
                    else {
                        const fuzzy = fuzzySearch(termLower, channelLower);
                        if (fuzzy !== null && fuzzy > 0) score = Math.min(60, fuzzy * 2);
                    }
                    if (score > 0) {
                        suggestionsMap.set(`channel:${log.channelName}`, {
                            type: "channel",
                            value: log.channelName,
                            display: `# ${log.channelName}`,
                            score
                        });
                    }
                }
            }
        }

        // Add user suggestions to main map
        for (const [userId, suggestion] of userSuggestionsMap.entries()) {
            suggestionsMap.set(`user:${userId}`, suggestion);
        }

        // Convert to array, sort by score, and limit to top 8
        return Array.from(suggestionsMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(({ type, value, display, userId, avatarUrl }): { type: "user" | "channel"; value: string; display: string; userId?: string; avatarUrl?: string; } => ({ type, value, display, userId, avatarUrl }));
    }, []);

    // Update suggestions when search term changes (with debouncing)
    React.useEffect(() => {
        if (!searchTerm.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Don't show suggestions if we just selected one
        if (isSelectingSuggestionRef.current) {
            isSelectingSuggestionRef.current = false;
            setShowSuggestions(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            const newSuggestions = generateSuggestions(searchTerm, logs);
            setSuggestions(newSuggestions);
            setShowSuggestions(newSuggestions.length > 0);
            setSelectedSuggestionIndex(-1);
        }, 200); // 200ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm, logs, generateSuggestions]);

    /**
     * Clears all stored logs from persistent storage and UI state
     * Provides immediate UI feedback
     */
    async function clearAllLogs() {
        try {
            await DataStore.set(LOG_KEY, []);
            setLogs([]);
        } catch (error) {
            console.error("Failed to clear logs:", error);
        }
    }

    /**
     * Fuzzy search algorithm for typo-tolerant matching
     * Based on character sequence matching with scoring
     * @param searchQuery - The search term to match
     * @param searchString - The string to search in
     * @returns Score (positive number) if match found, null otherwise
     */
    function fuzzySearch(searchQuery: string, searchString: string): number | null {
        if (!searchQuery || !searchString) return null;

        let searchIndex = 0;
        let score = 0;
        const queryLower = searchQuery.toLowerCase();
        const stringLower = searchString.toLowerCase();

        for (let i = 0; i < stringLower.length; i++) {
            if (stringLower[i] === queryLower[searchIndex]) {
                score++;
                searchIndex++;
            } else {
                score--;
            }

            if (searchIndex === queryLower.length) {
                return score;
            }
        }

        return null;
    }

    /**
     * Enhanced search function with fuzzy matching and extended scope
     * Searches across username, global name, user ID, and channel name
     * @param log - Log entry to check
     * @param searchTerm - Search string to match against
     * @returns Match score (0-100) for ranking, or null if no match
     */
    function searchMatches(log: LogEntry, searchTerm: string): number | null {
        if (!searchTerm || !searchTerm.trim()) return 100; // Show all if no search term

        const term = searchTerm.toLowerCase().trim();

        // Safe string checking with null/undefined protection
        const username = (log.username || "").toLowerCase();
        const globalName = (log.globalName || "").toLowerCase();
        const userId = log.userId || "";
        const channelName = (log.channelName || "").toLowerCase();

        // Exact matches get highest score (100)
        if (username === term || globalName === term || userId === term || channelName === term) {
            return 100;
        }

        // User ID exact match (case-sensitive for IDs)
        if (userId === searchTerm.trim()) {
            return 100;
        }

        // Starts with gets high score (90)
        if (username.startsWith(term) || globalName.startsWith(term) || channelName.startsWith(term)) {
            return 90;
        }

        // Contains gets medium score (70)
        if (username.includes(term) || globalName.includes(term) || channelName.includes(term)) {
            return 70;
        }

        // Fuzzy matching - get best score from all fields
        let bestFuzzyScore: number | null = null;

        const usernameFuzzy = fuzzySearch(term, username);
        const globalNameFuzzy = fuzzySearch(term, globalName);
        const channelFuzzy = fuzzySearch(term, channelName);

        if (usernameFuzzy !== null && usernameFuzzy > 0) {
            bestFuzzyScore = Math.max(bestFuzzyScore || 0, Math.min(60, usernameFuzzy * 2));
        }
        if (globalNameFuzzy !== null && globalNameFuzzy > 0) {
            bestFuzzyScore = Math.max(bestFuzzyScore || 0, Math.min(60, globalNameFuzzy * 2));
        }
        if (channelFuzzy !== null && channelFuzzy > 0) {
            bestFuzzyScore = Math.max(bestFuzzyScore || 0, Math.min(60, channelFuzzy * 2));
        }

        return bestFuzzyScore;
    }

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
    const startIndex = currentPage * LOGS_PER_PAGE;
    const endIndex = startIndex + LOGS_PER_PAGE;
    const currentPageLogs = filteredLogs.slice(startIndex, endIndex);

    // Statistics calculations for the dashboard
    const statistics = {
        joinCount: logs.filter(l => l.action === "join").length,
        leaveCount: logs.filter(l => l.action === "leave").length,
        uniqueUsers: new Set(logs.map(l => l.userId)).size,
        totalSessions: logs.filter(l => l.sessionDuration).length,
        avgSessionDuration: (() => {
            const totalSessions = logs.filter(l => l.sessionDuration).length;
            return totalSessions > 0
                ? logs.filter(l => l.sessionDuration).reduce((sum, l) => sum + (l.sessionDuration || 0), 0) / totalSessions
                : 0;
        })()
    };


    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE} className={`${cl("root")} vc-vcl-modal-root`}>
            {/* Modal Header - Title, Statistics, and Action Buttons */}
            <ModalHeader className={`${cl("head")} vc-vcl-modal-head`}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                        <Text variant="heading-xl/semibold" className="vc-vcl-modal-title" style={{ color: "#ffffff" }}>
                            Voice Logs
                        </Text>
                        {/* Statistics inline with title */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "14px" }}>
                            <span style={{ color: settings.store.colorStatisticsByFilter && filter === "all" ? "var(--text-normal)" : "inherit" }}>
                                <strong>{logs.length}</strong> events
                            </span>
                            <span>•</span>
                            <span style={{ color: settings.store.colorStatisticsByFilter && (filter === "join" || filter === "all") ? "#5cb87a" : "inherit" }}>
                                <strong>{statistics.joinCount}</strong> joins
                            </span>
                            <span>•</span>
                            <span style={{ color: settings.store.colorStatisticsByFilter && (filter === "leave" || filter === "all") ? "#e85d5d" : "inherit" }}>
                                <strong>{statistics.leaveCount}</strong> leaves
                            </span>
                            <span>•</span>
                            <span style={{ color: settings.store.colorStatisticsByFilter && filter === "all" ? "#6b8cff" : "inherit" }}>
                                <strong>{statistics.uniqueUsers}</strong> users
                            </span>
                        </div>
                    </div>
                    {/* Action buttons - Refresh and Close */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                            onClick={loadLogs}
                            disabled={loading}
                            className="vc-vcl-modal-header-action-btn"
                            style={{
                                background: "none",
                                border: "none",
                                cursor: loading ? "not-allowed" : "pointer",
                                color: "#ffffff",
                                fontSize: "18px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: loading ? 0.5 : 1,
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={e => {
                                if (!loading) {
                                    e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)";
                                }
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            ⟲
                        </button>
                        <button
                            onClick={modalProps.onClose}
                            className="vc-vcl-modal-header-action-btn"
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--status-danger)",
                                fontSize: "18px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </ModalHeader>

            <ModalContent className={`${cl("contents")} vc-vcl-modal-contents vc-vcl-modal-fade-in`} style={{ padding: "20px" }}>

                {/* Inline Filter and Search Controls */}
                <div className="vc-vcl-modal-slide-in" style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                    width: "100%"
                }}>
                    {/* Filter Buttons - Compact */}
                    <div className="vc-vcl-modal-filters">
                        <Button
                            size={Button.Sizes.MEDIUM}
                            color={filter === "all" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                            onClick={() => setFilter("all")}
                            className="vc-vcl-modal-filter-btn"
                        >
                            All
                        </Button>
                        <Button
                            size={Button.Sizes.MEDIUM}
                            color={filter === "join" ? Button.Colors.GREEN : Button.Colors.PRIMARY}
                            onClick={() => setFilter("join")}
                            className="vc-vcl-modal-filter-btn"
                        >
                            Joins
                        </Button>
                        <Button
                            size={Button.Sizes.MEDIUM}
                            color={filter === "leave" ? Button.Colors.RED : Button.Colors.PRIMARY}
                            onClick={() => setFilter("leave")}
                            className="vc-vcl-modal-filter-btn"
                        >
                            Leaves
                        </Button>
                    </div>

                    {/* Search Input - Compact */}
                    <div className="vc-vcl-modal-search-container">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search users or channels..."
                            value={searchTerm}
                            className="vc-vcl-modal-search-input"
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onKeyDown={e => {
                                if (!showSuggestions || suggestions.length === 0) return;

                                switch (e.key) {
                                    case "ArrowDown":
                                        e.preventDefault();
                                        setSelectedSuggestionIndex(prev =>
                                            prev < suggestions.length - 1 ? prev + 1 : 0
                                        );
                                        break;
                                    case "ArrowUp":
                                        e.preventDefault();
                                        setSelectedSuggestionIndex(prev =>
                                            prev > 0 ? prev - 1 : suggestions.length - 1
                                        );
                                        break;
                                    case "Enter":
                                        e.preventDefault();
                                        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
                                            isSelectingSuggestionRef.current = true;
                                            setSearchTerm(suggestions[selectedSuggestionIndex].value);
                                            setShowSuggestions(false);
                                            setSelectedSuggestionIndex(-1);
                                        }
                                        break;
                                    case "Escape":
                                        e.preventDefault();
                                        setShowSuggestions(false);
                                        setSelectedSuggestionIndex(-1);
                                        searchInputRef.current?.blur();
                                        break;
                                }
                            }}
                            style={{
                                paddingRight: searchTerm ? "80px" : "20px", // Add space for results counter and match user card padding
                            }}
                            onFocus={e => {
                                e.currentTarget.style.borderColor = "var(--brand-experiment)";
                                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(88, 101, 242, 0.2)";
                                // Only show suggestions on focus if we're not selecting a suggestion
                                if (searchTerm.trim() && suggestions.length > 0 && !isSelectingSuggestionRef.current) {
                                    setShowSuggestions(true);
                                }
                            }}
                            onBlur={e => {
                                e.currentTarget.style.borderColor = "var(--background-modifier-accent)";
                                e.currentTarget.style.boxShadow = "none";
                                // Delay hiding suggestions to allow clicks
                                setTimeout(() => {
                                    if (!suggestionsRef.current?.matches(":hover")) {
                                        setShowSuggestions(false);
                                    }
                                }, 200);
                            }}
                        />
                        {/* Results counter - positioned inside the input */}
                        {searchTerm && (
                            <div className="vc-vcl-modal-search-results-counter">
                                {filteredLogs.length} found
                            </div>
                        )}
                        {/* Autocomplete Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div
                                ref={suggestionsRef}
                                onMouseDown={e => e.preventDefault()} // Prevent input blur on click
                                className="vc-vcl-modal-suggestions"
                            >
                                <ScrollerThin style={{ maxHeight: "240px" }}>
                                    {suggestions.map((suggestion, index) => (
                                        <div
                                            key={`${suggestion.type}-${suggestion.value}-${index}`}
                                            className={`vc-vcl-modal-suggestion-item ${selectedSuggestionIndex === index ? "vc-vcl-modal-suggestion-selected" : ""}`}
                                            onClick={() => {
                                                isSelectingSuggestionRef.current = true;
                                                setSearchTerm(suggestion.value);
                                                setShowSuggestions(false);
                                                setSelectedSuggestionIndex(-1);
                                            }}
                                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                        >
                                            {suggestion.type === "user" && suggestion.avatarUrl ? (
                                                <Avatar
                                                    src={suggestion.avatarUrl}
                                                    size="SIZE_24"
                                                    aria-label={suggestion.display}
                                                    className="vc-vcl-modal-suggestion-avatar"
                                                />
                                            ) : (
                                                <span style={{
                                                    fontSize: "18px",
                                                    width: "24px",
                                                    height: "24px",
                                                    textAlign: "center",
                                                    opacity: selectedSuggestionIndex === index ? 1 : 0.8,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}>
                                                    {suggestion.type === "user" ? "👤" : "🔊"}
                                                </span>
                                            )}
                                            <span className="vc-vcl-modal-suggestion-text">
                                                {suggestion.display}
                                            </span>
                                        </div>
                                    ))}
                                </ScrollerThin>
                            </div>
                        )}
                    </div>
                </div>



                {/* Main Content Area - Optimized for information density */}
                <div style={{ height: "450px", position: "relative" }}>
                    {loading ? (
                        // Enhanced loading state with animation
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            flexDirection: "column",
                            gap: "12px",
                            color: "var(--text-muted)",
                            animation: "fade-in-up 0.3s ease-out"
                        }}>
                            <div style={{
                                fontSize: "32px",
                                animation: "pulse 2s infinite"
                            }}>📊</div>
                            <Text variant="text-md/normal" style={{ animation: "fadeInUp 0.5s ease-out" }}>
                                Loading voice logs...
                            </Text>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        // Enhanced empty state with helpful tips
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            flexDirection: "column",
                            gap: "16px",
                            color: "var(--text-muted)",
                            animation: "scaleIn 0.4s ease-out"
                        }}>
                            <div style={{
                                fontSize: "48px",
                                opacity: 0.6,
                                animation: "pulse 3s infinite"
                            }}>
                                {searchTerm ? "🔍" : "🎤"}
                            </div>
                            <div style={{ textAlign: "center", maxWidth: "300px" }}>
                                <Text variant="text-lg/semibold" style={{
                                    marginBottom: "8px",
                                    animation: "fadeInUp 0.5s ease-out"
                                }}>
                                    {searchTerm ? "No matching logs found" : "No logs yet"}
                                </Text>
                                <Text variant="text-sm/normal" style={{
                                    opacity: 0.8,
                                    animation: "fadeInUp 0.6s ease-out"
                                }}>
                                    {searchTerm
                                        ? "Try adjusting your search terms or clearing the filter"
                                        : "Join a voice channel to start logging your voice activity!"
                                    }
                                </Text>
                            </div>
                            {searchTerm && (
                                <Button
                                    size={Button.Sizes.SMALL}
                                    color={Button.Colors.PRIMARY}
                                    onClick={() => setSearchTerm("")}
                                    style={{
                                        fontSize: "12px",
                                        animation: "slide-in 0.7s ease-out"
                                    }}
                                >
                                    Clear Search
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Log list with pagination */}
                            <ScrollerThin style={{ paddingRight: "4px", overflow: "visible" }}>
                                {currentPageLogs.map((log, index) => (
                                    <div
                                        key={`${log.timestamp}-${log.userId}-${log.action}`}
                                        style={{
                                            animation: `fade-in-up 0.3s ease-out ${index * 0.02}s both`
                                        }}
                                    >
                                        <LogEntryRow
                                            log={log}
                                            onCloseModal={modalProps.onClose}
                                            onFilterToUser={setCurrentUserId}
                                            onSetSearchTerm={term => {
                                                isSelectingSuggestionRef.current = true;
                                                setSearchTerm(term);
                                            }}
                                            onHideSuggestions={() => {
                                                isSelectingSuggestionRef.current = true;
                                                setShowSuggestions(false);
                                                setSelectedSuggestionIndex(-1);
                                            }}
                                        />
                                    </div>
                                ))}
                            </ScrollerThin>

                            {/* Modern Pagination Controls - Moved to bottom */}
                            {totalPages > 1 && (
                                <>
                                    {/* Pagination Controls */}
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginTop: "16px",
                                        marginBottom: "12px",
                                        padding: "12px",
                                        backgroundColor: "var(--background-secondary-alt)",
                                        borderRadius: "12px",
                                        border: "1px solid var(--background-modifier-accent)",
                                        borderTop: "1px solid var(--background-modifier-accent)"
                                    }}>
                                        {/* Previous Button */}
                                        <button
                                            disabled={currentPage === 0}
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            style={{
                                                background: currentPage === 0 ? "var(--background-modifier-accent)" : "var(--background-secondary)",
                                                border: "1px solid var(--background-modifier-accent)",
                                                borderRadius: "8px",
                                                padding: "8px 12px",
                                                color: currentPage === 0 ? "var(--text-muted)" : "white",
                                                cursor: currentPage === 0 ? "not-allowed" : "pointer",
                                                fontSize: "14px",
                                                fontWeight: "500",
                                                transition: "all 0.2s ease",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                            onMouseEnter={e => {
                                                if (currentPage !== 0) {
                                                    e.currentTarget.style.backgroundColor = "var(--background-tertiary)";
                                                    e.currentTarget.style.transform = "translateY(-1px)";
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (currentPage !== 0) {
                                                    e.currentTarget.style.backgroundColor = "var(--background-secondary)";
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                }
                                            }}
                                        >
                                            ‹
                                        </button>

                                        {/* Page Numbers */}
                                        {(() => {
                                            const pages: React.ReactNode[] = [];
                                            const maxVisiblePages = 7;
                                            let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
                                            const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

                                            // Adjust start if we're near the end
                                            if (endPage - startPage < maxVisiblePages - 1) {
                                                startPage = Math.max(0, endPage - maxVisiblePages + 1);
                                            }

                                            // First page + ellipsis if needed
                                            if (startPage > 0) {
                                                pages.push(
                                                    <button
                                                        key={0}
                                                        onClick={() => setCurrentPage(0)}
                                                        style={{
                                                            background: "var(--background-secondary)",
                                                            border: "1px solid var(--background-modifier-accent)",
                                                            borderRadius: "8px",
                                                            padding: "8px 12px",
                                                            color: "white",
                                                            cursor: "pointer",
                                                            fontSize: "14px",
                                                            fontWeight: "500",
                                                            minWidth: "36px",
                                                            transition: "all 0.2s ease"
                                                        }}
                                                        onMouseEnter={e => {
                                                            e.currentTarget.style.backgroundColor = "var(--background-tertiary)";
                                                            e.currentTarget.style.transform = "translateY(-1px)";
                                                        }}
                                                        onMouseLeave={e => {
                                                            e.currentTarget.style.backgroundColor = "var(--background-secondary)";
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                        }}
                                                    >
                                                        1
                                                    </button>
                                                );
                                                if (startPage > 1) {
                                                    pages.push(
                                                        <span key="ellipsis1" style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px" }}>
                                                            ...
                                                        </span>
                                                    );
                                                }
                                            }

                                            // Visible page range
                                            for (let i = startPage; i <= endPage; i++) {
                                                const isActive = i === currentPage;
                                                pages.push(
                                                    <button
                                                        key={i}
                                                        onClick={() => setCurrentPage(i)}
                                                        style={{
                                                            background: isActive ? "var(--brand-500)" : "var(--background-secondary)",
                                                            border: `1px solid ${isActive ? "var(--brand-500)" : "var(--background-modifier-accent)"}`,
                                                            borderRadius: "8px",
                                                            padding: "8px 12px",
                                                            color: isActive ? "white" : "white",
                                                            cursor: "pointer",
                                                            fontSize: "14px",
                                                            fontWeight: isActive ? "600" : "500",
                                                            minWidth: "36px",
                                                            transition: "all 0.2s ease",
                                                            boxShadow: isActive ? "0 2px 8px rgba(88, 101, 242, 0.3)" : "none"
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (!isActive) {
                                                                e.currentTarget.style.backgroundColor = "var(--background-tertiary)";
                                                                e.currentTarget.style.transform = "translateY(-1px)";
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (!isActive) {
                                                                e.currentTarget.style.backgroundColor = "var(--background-secondary)";
                                                                e.currentTarget.style.transform = "translateY(0)";
                                                            }
                                                        }}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                );
                                            }

                                            // Ellipsis + last page if needed
                                            if (endPage < totalPages - 1) {
                                                if (endPage < totalPages - 2) {
                                                    pages.push(
                                                        <span key="ellipsis2" style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px" }}>
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                pages.push(
                                                    <button
                                                        key={totalPages - 1}
                                                        onClick={() => setCurrentPage(totalPages - 1)}
                                                        style={{
                                                            background: "var(--background-secondary)",
                                                            border: "1px solid var(--background-modifier-accent)",
                                                            borderRadius: "8px",
                                                            padding: "8px 12px",
                                                            color: "white",
                                                            cursor: "pointer",
                                                            fontSize: "14px",
                                                            fontWeight: "500",
                                                            minWidth: "36px",
                                                            transition: "all 0.2s ease"
                                                        }}
                                                        onMouseEnter={e => {
                                                            e.currentTarget.style.backgroundColor = "var(--background-tertiary)";
                                                            e.currentTarget.style.transform = "translateY(-1px)";
                                                        }}
                                                        onMouseLeave={e => {
                                                            e.currentTarget.style.backgroundColor = "var(--background-secondary)";
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                        }}
                                                    >
                                                        {totalPages}
                                                    </button>
                                                );
                                            }

                                            return pages;
                                        })()}

                                        {/* Next Button */}
                                        <button
                                            disabled={currentPage === totalPages - 1}
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            style={{
                                                background: currentPage === totalPages - 1 ? "var(--background-modifier-accent)" : "var(--background-secondary)",
                                                border: "1px solid var(--background-modifier-accent)",
                                                borderRadius: "8px",
                                                padding: "8px 12px",
                                                color: currentPage === totalPages - 1 ? "rgba(255, 255, 255, 0.5)" : "white",
                                                cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
                                                fontSize: "14px",
                                                fontWeight: "500",
                                                transition: "all 0.2s ease",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                            onMouseEnter={e => {
                                                if (currentPage !== totalPages - 1) {
                                                    e.currentTarget.style.backgroundColor = "var(--background-tertiary)";
                                                    e.currentTarget.style.transform = "translateY(-1px)";
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (currentPage !== totalPages - 1) {
                                                    e.currentTarget.style.backgroundColor = "var(--background-secondary)";
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                }
                                            }}
                                        >
                                            ›
                                        </button>
                                    </div>

                                    {/* Pagination info - Below pagination controls */}
                                    <div style={{
                                        padding: "16px 12px 8px",
                                        textAlign: "center",
                                        color: "var(--text-muted)",
                                        fontSize: "12px"
                                    }}>
                                        Showing {currentPageLogs.length} of {filteredLogs.length} logs • Page {currentPage + 1} of {totalPages}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

/**
 * Opens the voice logs modal with error boundary protection
 * Provides a clean interface for accessing the log viewer from anywhere in the plugin
 * @param initialSearchTerm - Optional search term to pre-populate the search field
 * @param initialUserId - Optional user ID to auto-select the matching user suggestion
 */
function openVoiceLogsModal(initialSearchTerm?: string, initialUserId?: string) {
    openModal(props =>
        <ErrorBoundary>
            <VoiceLogsModal modalProps={props} initialSearchTerm={initialSearchTerm} initialUserId={initialUserId} />
        </ErrorBoundary>
    );
}

/**
 * Minimal header button component for voice logger access
 * Always visible regardless of voice channel status for better accessibility
 * Uses Discord's native HeaderBarIcon component for consistent styling
 */
function VoiceLoggerHeaderButton() {
    const currentUser = UserStore.getCurrentUser();

    // Always show button regardless of voice channel status
    // Users should be able to view logs even when not in voice channels
    if (!currentUser) return null;

    const handleMiddleClick = (e: React.MouseEvent) => {
        if (e.button === 1) { // Middle mouse button
            e.preventDefault();
            e.stopPropagation();
            const plugin = plugins.VoiceChannelLogger;
            if (plugin) {
                openPluginModal(plugin);
            }
        }
    };

    return (
        <div onAuxClick={handleMiddleClick} onMouseDown={handleMiddleClick}>
            <HeaderBarIcon
                className="vc-voice-logger-btn"
                onClick={() => openVoiceLogsModal()}
                tooltip="Voice Logs"
                icon={() => (
                    <svg
                        aria-hidden="true"
                        role="img"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        style={{
                            color: "var(--interactive-icon-default)",
                            transition: "color 0.2s ease"
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = "var(--interactive-icon-hover)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = "var(--interactive-icon-default)";
                        }}
                    >
                        {/* Custom microphone icon */}
                        <g>
                            <path fill="currentColor" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                            <path fill="currentColor" d="M19 10v2a7 7 0 0 1-14 0v-2a1 1 0 1 1 2 0v2a5 5 0 0 0 10 0v-2a1 1 0 1 1 2 0Z" />
                            <path fill="currentColor" d="M12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z" />
                        </g>
                    </svg>
                )}
            />
        </div>
    );
}

/**
 * Fragment wrapper component for injecting the header button into Discord's toolbar
 * Uses strategic positioning to avoid conflicts with other Vencord plugins
 * Inserts the voice logger button early in the toolbar (position 1) to prevent conflicts
 * with plugins like Vencord Toolbox that insert near the end of the children array
 * @param children - Array of React elements representing Discord's header toolbar buttons
 */
function HeaderFragmentWrapper({ children }: { children: ReactNode[]; }) {
    // Insert at position 1 (second element) to avoid conflicts with Vencord Toolbox
    // This positioning strategy ensures coexistence with other header button plugins
    const insertPosition = Math.min(1, children.length);

    children.splice(
        insertPosition, 0,
        <ErrorBoundary noop key="voice-logger-header-btn">
            <VoiceLoggerHeaderButton />
        </ErrorBoundary>
    );

    return <>{children}</>;
}

// ===== Console Command Functions =====

/**
 * Exports logs as JSON string for backup or analysis
 */
export async function exportLogs(): Promise<string> {
    try {
        const logs = await DataStore.get(LOG_KEY) as LogEntry[] || [];
        return JSON.stringify(logs, null, 2); // Pretty-printed JSON
    } catch (error) {
        logger.error("Failed to export logs:", error);
        return "[]"; // Return empty array on error
    }
}

/**
 * Clears all stored logs with user feedback
 */
export async function clearLogs(): Promise<void> {
    try {
        await DataStore.set(LOG_KEY, []);
        logger.info("Voice channel logs cleared");
        showToast("Voice channel logs cleared", Toasts.Type.SUCCESS);
    } catch (error) {
        logger.error("Failed to clear logs:", error);
        showToast("Failed to clear logs", Toasts.Type.FAILURE);
    }
}

/**
 * Displays logs in browser console for quick viewing
 */
export async function openLogsInConsole(): Promise<void> {
    try {
        const logs = await DataStore.get(LOG_KEY) as LogEntry[] || [];

        if (logs.length === 0) {
            logger.info("No voice channel logs found");
            showToast("No logs found", Toasts.Type.MESSAGE);
            return;
        }

        logger.info(`Found ${logs.length} voice channel log entries:`);
        logs.forEach((log, index) => {
            logger.info(`${index + 1}. ${formatLogMessage(log)}`);
        });

        showToast(`Displayed ${logs.length} log entries in console`, Toasts.Type.SUCCESS);
    } catch (error) {
        logger.error("Failed to display logs:", error);
        showToast("Failed to display logs", Toasts.Type.FAILURE);
    }
}

/**
 * Opens the logs GUI modal
 */
export function openLogsGUI(): void {
    openVoiceLogsModal();
}

/**
 * Alias for opening logs modal (for console access)
 */
export function openVoiceLogsModalLocal(): void {
    openVoiceLogsModal();
}

/**
 * Microphone icon component for context menu
 * Matches the icon used in the header button
 */
function VoiceLogsIcon() {
    return (
        <svg
            aria-hidden="true"
            role="img"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            style={{
                color: "var(--interactive-icon-default)"
            }}
        >
            <g>
                <path fill="currentColor" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                <path fill="currentColor" d="M19 10v2a7 7 0 0 1-14 0v-2a1 1 0 1 1 2 0v2a5 5 0 0 0 10 0v-2a1 1 0 1 1 2 0Z" />
                <path fill="currentColor" d="M12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z" />
            </g>
        </svg>
    );
}

// Follow/Unfollow icons for FollowUser plugin integration
function FollowIcon() {
    return (
        <svg
            aria-hidden="true"
            role="img"
            width="20"
            height="20"
            viewBox="0 -960 960 960"
            style={{
                color: "var(--interactive-icon-default)"
            }}
        >
            <path
                fill="currentColor"
                d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"
            />
        </svg>
    );
}

function UnfollowIcon() {
    return (
        <svg
            aria-hidden="true"
            role="img"
            width="20"
            height="20"
            viewBox="0 -960 960 960"
            style={{
                color: "var(--interactive-icon-default)"
            }}
        >
            <path
                fill="currentColor"
                d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"
            />
        </svg>
    );
}

/**
 * Context menu callback for user context menu
 * Adds "View Voice Logs" option that opens the modal with the user pre-filtered
 */
const userContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const { user } = props;
    if (!user) return;

    // Find a good position to insert the menu item (after user info items, before dev actions)
    const insertIndex = children.findIndex((child: any) =>
        child?.props?.id === "dev-actions" || child?.props?.id === "user-profile"
    );
    const targetIndex = insertIndex >= 0 ? insertIndex : children.length;

    children.splice(targetIndex, 0,
        <Menu.MenuItem
            id="vc-voice-logs-user"
            label="View Voice Logs"
            icon={VoiceLogsIcon}
            action={() => {
                // Pass userId to auto-select the matching user suggestion
                openVoiceLogsModal(undefined, user.id);
            }}
        />
    );
};

// Main plugin definition with error handling
export default definePlugin({
    name: "لوق رومات الصوت",
    description: "Voice channel logger that tracks joins and leaves in real time with timestamps and user details",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    settings,

    patches: [
        {
            find: ".controlButtonWrapper,",
            replacement: {
                match: /(?<=function (\i).{0,100}\()\i.Fragment,(?=.+?toolbar:\1\(\))/,
                replace: "$self.HeaderFragmentWrapper,"
            },
            // Make patch optional to prevent plugin loading failure
            noWarn: true
        },
        {
            find: /toolbar:\i,mobileToolbar:\i/,
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addIconToToolBar(arguments[0]);$2"
            },
            noWarn: true
        }
    ],

    HeaderFragmentWrapper: ErrorBoundary.wrap(function SafeHeaderFragmentWrapper(props) {
        try {
            return HeaderFragmentWrapper(props);
        } catch (error) {
            logger.error("HeaderFragmentWrapper critical error:", error);
            return React.createElement(React.Fragment, {}, props.children);
        }
    }, {
        fallback: () => React.createElement("span", { style: { color: "red" } }, "Failed to render Voice Logger button :("),
        onError: error => {
            logger.error("HeaderFragmentWrapper error boundary:", error);
        }
    }),

    VoiceLoggerIndicator() {
        return <VoiceLoggerHeaderButton />;
    },

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar)) {
            e.toolbar.unshift(
                <ErrorBoundary noop={true} key="voice-logger-indicator">
                    <this.VoiceLoggerIndicator />
                </ErrorBoundary>
            );
        } else {
            e.toolbar = [
                <ErrorBoundary noop={true} key="voice-logger-indicator">
                    <this.VoiceLoggerIndicator />
                </ErrorBoundary>,
                e.toolbar,
            ];
        }
    },

    contextMenus: {
        "user-context": userContextMenuPatch
    },

    flux: {
        /**
         * Optimized voice state update handler with comprehensive error handling
         * Processes Discord voice state changes to detect join/leave events
         * Implements smart suppression logic to prevent spam during initialization
         * Features enhanced user/channel data resolution with fallback mechanisms
         */
        async VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            try {
                // Early validation - exit immediately if invalid data received
                if (!voiceStates || !Array.isArray(voiceStates) || voiceStates.length === 0) {
                    if (voiceStates && !Array.isArray(voiceStates)) {
                        logger.warn("Invalid voiceStates received:", voiceStates);
                    }
                    return;
                }

                // Safely get current user and channel info with error handling
                let currentUser, myChannelId;
                try {
                    currentUser = UserStore.getCurrentUser();
                    myChannelId = SelectedChannelStore.getVoiceChannelId();
                } catch (error) {
                    logger.warn("Failed to get current user or channel:", error);
                    return;
                }

                // Performance optimization: minimal debug logging only when enabled
                if (settings.store.enableDebugLogging && voiceStates.length > 0) {
                    logger.info(`Processing ${voiceStates.length} voice state updates`);
                }

                // Track when the current user joins/leaves voice channels
                const myState = voiceStates.find(state => state.userId === currentUser?.id);

                // Handle plugin initialization and Discord restarts
                if (!pluginInitialized && myChannelId && currentUser) {
                    pluginInitialized = true;
                    lastUserChannelId = myChannelId;
                    initializationStartTime = Date.now();
                    processedUsersDuringInit.clear();

                    if (settings.store.suppressToastsForExistingUsers) {
                        initializationSuppressUntil = Date.now() + INITIALIZATION_SUPPRESSION_DURATION;

                        // Safe call to VoiceStateStore with fallback
                        let usersInChannel;
                        try {
                            usersInChannel = VoiceStateStore?.getVoiceStatesForChannel?.(myChannelId);
                        } catch (error) {
                            logger.warn("Failed to get voice states for channel:", error);
                            usersInChannel = null;
                        }

                        if (usersInChannel) {
                            Object.keys(usersInChannel).forEach(userId => {
                                if (userId !== currentUser.id) {
                                    processedUsersDuringInit.add(userId);
                                }
                            });
                        }

                        if (settings.store.enableDebugLogging) {
                            const userCount = usersInChannel ? Object.keys(usersInChannel).length : 0;
                            logger.info(`Plugin initialized with ${userCount} users in channel. Suppressing duplicates for ${INITIALIZATION_SUPPRESSION_DURATION}ms`);
                        }
                    }
                }

                // Handle user channel switching with smart suppression
                if (myState && currentUser && settings.store.suppressToastsForExistingUsers) {
                    const userJoinedNewChannel = myState.channelId && myState.channelId !== lastUserChannelId;

                    if (userJoinedNewChannel && pluginInitialized) {
                        suppressToastsUntil = Date.now() + TOAST_SUPPRESSION_DURATION;
                        if (settings.store.enableDebugLogging) {
                            logger.info(`User joined new channel, suppressing toasts for ${TOAST_SUPPRESSION_DURATION}ms`);
                        }
                        // Log all users already in the channel when you join
                        if (myState.channelId) {
                            logUsersAlreadyInChannel(myState.channelId, currentUser.id, true);
                        }
                    }

                    lastUserChannelId = myState.channelId || null;
                } else if (myState && currentUser) {
                    const userJoinedNewChannel = myState.channelId && myState.channelId !== lastUserChannelId;
                    lastUserChannelId = myState.channelId || null;
                    if (!pluginInitialized) {
                        pluginInitialized = true;
                        initializationStartTime = Date.now();
                        processedUsersDuringInit.clear();
                    } else if (userJoinedNewChannel && myState.channelId) {
                        // Log all users already in the channel when you join (even if suppressToastsForExistingUsers is disabled)
                        logUsersAlreadyInChannel(myState.channelId, currentUser.id, false);
                    }
                }

                // Exit early if we don't have the required context for logging
                if (!currentUser || !myChannelId) {
                    return;
                }

                // Clean up processed users set after initialization period expires
                if (Date.now() > initializationSuppressUntil && processedUsersDuringInit.size > 0) {
                    processedUsersDuringInit.clear();
                }

                // Process voice state updates with error handling
                let eventsProcessed = 0;
                let eventsSkipped = 0;

                for (const state of voiceStates) {
                    try {
                        const { userId, channelId, oldChannelId } = state;

                        if (!userId) {
                            eventsSkipped++;
                            continue;
                        }

                        const isMe = userId === currentUser?.id;
                        if (isMe && !settings.store.logOwnActions) {
                            eventsSkipped++;
                            continue;
                        }

                        // Check if this event relates to our current voice channel
                        const joiningMyChannel = channelId === myChannelId;
                        const leavingMyChannel = oldChannelId === myChannelId;
                        const interactingWithMyChannel = joiningMyChannel || leavingMyChannel;

                        if (!interactingWithMyChannel) {
                            eventsSkipped++;
                            continue;
                        }

                        // Determine the specific action type
                        let action: "join" | "leave" | null = null;
                        if (joiningMyChannel && !leavingMyChannel) {
                            action = "join";
                        } else if (leavingMyChannel && !joiningMyChannel) {
                            action = "leave";
                        }

                        if (!action) {
                            eventsSkipped++;
                            continue;
                        }

                        // Handle initialization suppression for join events
                        const isInInitializationSuppression = Date.now() < initializationSuppressUntil;
                        if (isInInitializationSuppression && action === "join") {
                            if (processedUsersDuringInit.has(userId)) {
                                eventsSkipped++;
                                continue;
                            }
                            processedUsersDuringInit.add(userId);
                        }

                        // Get enhanced user data with robust fallback mechanisms
                        const user = await getEnhancedUserData(userId);

                        const relevantChannelId = channelId || oldChannelId;
                        const channel = ChannelStore.getChannel(relevantChannelId!) || {
                            id: relevantChannelId,
                            name: `Channel_${relevantChannelId?.slice(-4) || "Unknown"}`,
                            guild_id: null
                        };

                        const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;

                        // Session duration tracking
                        let sessionDuration: number | undefined;
                        if (settings.store.trackSessionDuration) {
                            if (action === "join") {
                                userSessions.set(userId, Date.now());
                            } else if (action === "leave") {
                                const joinTime = userSessions.get(userId);
                                if (joinTime) {
                                    sessionDuration = Date.now() - joinTime;
                                    userSessions.delete(userId);
                                }
                            }
                        }

                        // Enhanced user data collection for persistent display
                        let userAvatar: string | undefined;
                        let userAvatarUrl: string | undefined;
                        let userDiscriminator: string | undefined;

                        // Get the actual Discord user object for avatar URL generation
                        const discordUser = UserStore.getUser(userId);

                        // Collect avatar information from current user data
                        if (discordUser && typeof discordUser === "object") {
                            userAvatar = discordUser.avatar;
                            userDiscriminator = discordUser.discriminator;
                            // Try to get full avatar URL if user has getAvatarURL method
                            if (discordUser.getAvatarURL && typeof discordUser.getAvatarURL === "function") {
                                try {
                                    userAvatarUrl = discordUser.getAvatarURL(undefined, 32);
                                } catch (error) {
                                    // Fallback to manual construction if method fails
                                    if (userAvatar) {
                                        userAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${userAvatar}.png?size=32`;
                                    }
                                }
                            } else if (userAvatar) {
                                // Manual construction when method is not available
                                userAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${userAvatar}.png?size=32`;
                            }
                        }

                        const logEntry: LogEntry = {
                            timestamp: Date.now(),
                            userId: user.id,
                            username: user.username,
                            globalName: user.globalName,
                            channelId: relevantChannelId!,
                            channelName: channel.name || "Unknown Channel",
                            guildId: channel.guild_id,
                            guildName: guild?.name,
                            action: action,
                            sessionDuration: sessionDuration,
                            // Enhanced persistent user data
                            userAvatar: userAvatar,
                            userAvatarUrl: userAvatarUrl,
                            userDiscriminator: userDiscriminator,
                            userData: {
                                id: user.id,
                                username: user.username,
                                globalName: user.globalName,
                                avatar: userAvatar,
                                discriminator: userDiscriminator
                            }
                        };

                        // Determine toast suppression
                        const isInNormalSuppression = Date.now() < suppressToastsUntil;
                        const shouldSuppressToast = settings.store.suppressToastsForExistingUsers &&
                            (isInNormalSuppression || isInInitializationSuppression) &&
                            action === "join";

                        logVoiceEvent(logEntry, shouldSuppressToast);
                        eventsProcessed++;

                    } catch (error) {
                        logger.error("Error processing voice state update:", error);
                        eventsSkipped++;
                    }
                }

                // Provide summary only when there's meaningful activity
                if (eventsProcessed > 0 || (eventsSkipped > 0 && settings.store.enableDebugLogging)) {
                    const summary = `Voice events: ${eventsProcessed} logged, ${eventsSkipped} skipped`;
                    if (settings.store.enableDebugLogging && eventsSkipped > 0) {
                        logger.info(summary);
                    } else if (eventsProcessed > 0) {
                        logger.info(summary);
                    }
                }
            } catch (error) {
                logger.error("Critical error in VOICE_STATE_UPDATES handler:", error);
                // Don't rethrow to prevent breaking Vencord
            }
        },

        /**
         * Handle Discord connection events to refresh user cache
         * This ensures usernames remain visible after Discord restarts
         */
        CONNECTION_OPEN() {
            try {
                logger.info("Discord connection opened - refreshing user cache");

                // Refresh user data cache proactively
                setTimeout(() => {
                    refreshUserDataCache();
                }, 2000); // Small delay to let Discord initialize

                // Reset plugin initialization state to handle reconnection
                pluginInitialized = false;

            } catch (error) {
                logger.warn("Error in CONNECTION_OPEN handler:", error);
            }
        }
    },

    /**
     * Initialize plugin and display available commands
     */
    async start() {
        logger.info("Voice Channel Logger Minimal started");
        // Inject CSS animations safely after plugin start
        try {
            if (typeof document !== "undefined" && document.head) {
                const existingStyle = document.getElementById("vc-logger-minimal-styles");
                if (!existingStyle) {
                    const styleElement = document.createElement("style");
                    styleElement.id = "vc-logger-minimal-styles";
                    styleElement.textContent = animationStyles;
                    document.head.appendChild(styleElement);
                }
            }
        } catch (error) {
            logger.warn("Failed to inject CSS styles:", error);
        }

        logger.info("Available commands:");
        logger.info("  - Vencord.Plugins.plugins.VoiceChannelLoggerMinimal.exportLogs() - Export logs as JSON");
        logger.info("  - Vencord.Plugins.plugins.VoiceChannelLoggerMinimal.clearLogs() - Clear all logs");
        logger.info("  - Vencord.Plugins.plugins.VoiceChannelLoggerMinimal.openLogsInConsole() - Display logs in console");
        logger.info("  - Vencord.Plugins.plugins.VoiceChannelLoggerMinimal.openLogsGUI() - Open logs GUI modal");

        // Try to load UserVoiceShow component if available
        await loadUserVoiceShowComponent();

        // Reset all plugin state to ensure clean startup
        this.resetPluginState();

        // Initialize user cache from existing logs to prevent username visibility issues
        try {
            const storedLogs = await DataStore.get(LOG_KEY) as LogEntry[] || [];
            for (const log of storedLogs) {
                if (log.userData) {
                    const userData: CachedUserData = {
                        id: log.userData.id,
                        username: log.userData.username,
                        globalName: log.userData.globalName,
                        avatar: log.userData.avatar,
                        discriminator: log.userData.discriminator,
                        lastUpdated: log.timestamp,
                        lastSeen: Date.now()
                    };
                    userDataCache.set(log.userId, userData);
                }
            }
            logger.info(`Initialized user cache with ${userDataCache.size} users from existing logs`);
        } catch (error) {
            logger.warn("Failed to initialize user cache:", error);
        }

        // Set up periodic cache maintenance
        setInterval(() => {
            cleanupUserCache();
            refreshUserDataCache();
        }, USER_CACHE_REFRESH_INTERVAL);
    },

    /**
     * Clean up plugin state on shutdown
     */
    stop() {
        logger.info("Voice Channel Logger Minimal stopped");

        // Clean up injected CSS styles
        try {
            const styleElement = document.getElementById("vc-logger-minimal-styles");
            if (styleElement) {
                styleElement.remove();
            }
        } catch (error) {
            logger.warn("Failed to remove CSS styles:", error);
        }

        this.resetPluginState();
    },

    /**
     * Reset all plugin state variables
     */
    resetPluginState() {
        pluginInitialized = false;
        lastUserChannelId = null;
        suppressToastsUntil = 0;
        initializationSuppressUntil = 0;
        processedUsersDuringInit.clear();
        initializationStartTime = 0;
        userSessions.clear();
        // Clear user cache but preserve it for restart scenarios
        // userDataCache.clear(); // Commented out to maintain cache across restarts
    },

    // Export functions for console access
    exportLogs,
    clearLogs,
    openLogsInConsole,
    openLogsGUI,
    openVoiceLogsModalLocal
});
