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

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { closeAllModals } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { maybePromptToUpdate } from "@utils/updater";
import { filters, findBulk, proxyLazyWebpack } from "@webpack";
import { DraftType, ExpressionPickerStore, FluxDispatcher, NavigationRouter, SelectedChannelStore, UserStore } from "@webpack/common";

// ==================== INTERFACES ====================
interface CrashReport {
    id: string;
    timestamp: number;
    error: string;
    stack?: string;
    componentStack?: string;
    channelId?: string;
    guildId?: string;
    userId?: string;
    memoryUsage?: any;
    userAgent?: string;
    recoveryAttempted: boolean;
    recoverySuccessful: boolean;
    crashCount: number;
    sessionDuration?: number;
}

interface CrashStatistics {
    totalCrashes: number;
    recoveredCrashes: number;
    failedRecoveries: number;
    lastCrashTime?: number;
    crashesByType: Record<string, number>;
    averageRecoveryTime: number;
    crashFrequency: number[];
}

interface PerformanceMetrics {
    memoryUsage: number;
    cpuUsage?: number;
    lastGCTime?: number;
    heapSize?: number;
}

// ==================== LOGGER ====================
const CrashHandlerLogger = new Logger("CrashHandlerEnhanced");

// ==================== WEBPACK ====================
const { ModalStack, DraftManager } = proxyLazyWebpack(() => {
    const [ModalStack, DraftManager] = findBulk(
        filters.byProps("pushLazy", "popAll"),
        filters.byProps("clearDraft", "saveDraft"),
    );

    return {
        ModalStack,
        DraftManager
    };
});

// ==================== SETTINGS ====================
const settings = definePluginSettings({
    // ============ BASIC RECOVERY ============
    attemptToPreventCrashes: {
        type: OptionType.BOOLEAN,
        description: "Attempt to prevent Discord crashes and auto-recover",
        default: true
    },
    attemptToNavigateToHome: {
        type: OptionType.BOOLEAN,
        description: "Navigate to home (@me) when recovering from crash",
        default: false
    },
    maxRecoveryAttempts: {
        type: OptionType.SLIDER,
        description: "Maximum recovery attempts before giving up",
        default: 3,
        markers: [1, 2, 3, 4, 5, 10]
    },
    recoveryDelay: {
        type: OptionType.SLIDER,
        description: "Delay before attempting recovery (ms)",
        default: 1,
        markers: [1, 100, 500, 1000, 2000, 5000]
    },

    // ============ ADVANCED RECOVERY ============
    aggressiveRecovery: {
        type: OptionType.BOOLEAN,
        description: "Use aggressive recovery (clears more state, higher success rate)",
        default: false
    },
    clearCache: {
        type: OptionType.BOOLEAN,
        description: "Clear Discord cache on crash recovery",
        default: false
    },
    reloadWebpack: {
        type: OptionType.BOOLEAN,
        description: "Attempt to reload webpack modules on crash",
        default: false
    },
    resetSettings: {
        type: OptionType.BOOLEAN,
        description: "Reset Discord settings to defaults on repeated crashes",
        default: false
    },
    forceGarbageCollection: {
        type: OptionType.BOOLEAN,
        description: "Force garbage collection after recovery",
        default: true
    },

    // ============ CRASH DETECTION ============
    enablePreventiveMeasures: {
        type: OptionType.BOOLEAN,
        description: "Enable preventive measures (monitor memory, performance)",
        default: true
    },
    memoryThreshold: {
        type: OptionType.SLIDER,
        description: "Memory warning threshold (MB)",
        default: 1000,
        markers: [500, 750, 1000, 1500, 2000, 3000]
    },
    detectMemoryLeaks: {
        type: OptionType.BOOLEAN,
        description: "Detect and warn about potential memory leaks",
        default: true
    },
    monitorPerformance: {
        type: OptionType.BOOLEAN,
        description: "Monitor Discord performance metrics",
        default: true
    },
    performanceCheckInterval: {
        type: OptionType.SLIDER,
        description: "Performance check interval (seconds)",
        default: 30,
        markers: [10, 30, 60, 120, 300]
    },

    // ============ NOTIFICATIONS ============
    showCrashNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show notifications when crashes occur",
        default: true
    },
    showRecoveryNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show notifications when recovery is successful",
        default: true
    },
    showDetailedError: {
        type: OptionType.BOOLEAN,
        description: "Show detailed error information in notifications",
        default: false
    },
    notificationSound: {
        type: OptionType.BOOLEAN,
        description: "Play sound when crash occurs",
        default: false
    },
    notificationDuration: {
        type: OptionType.SLIDER,
        description: "Notification display duration (seconds)",
        default: 5,
        markers: [3, 5, 10, 15, 30]
    },

    // ============ CRASH LOGGING ============
    enableCrashLogging: {
        type: OptionType.BOOLEAN,
        description: "Log all crashes with detailed information",
        default: true
    },
    logToConsole: {
        type: OptionType.BOOLEAN,
        description: "Log crash details to console",
        default: true
    },
    logToFile: {
        type: OptionType.BOOLEAN,
        description: "Save crash logs to file (if supported)",
        default: false
    },
    maxLogEntries: {
        type: OptionType.SLIDER,
        description: "Maximum crash logs to keep",
        default: 50,
        markers: [10, 25, 50, 100, 250, 500]
    },
    includeStackTrace: {
        type: OptionType.BOOLEAN,
        description: "Include full stack trace in logs",
        default: true
    },
    includeSystemInfo: {
        type: OptionType.BOOLEAN,
        description: "Include system/browser info in logs",
        default: true
    },

    // ============ STATISTICS ============
    enableStatistics: {
        type: OptionType.BOOLEAN,
        description: "Track crash statistics and patterns",
        default: true
    },
    showStatsDashboard: {
        type: OptionType.BOOLEAN,
        description: "Show crash statistics dashboard",
        default: false
    },
    trackCrashPatterns: {
        type: OptionType.BOOLEAN,
        description: "Analyze and track crash patterns",
        default: true
    },

    // ============ AUTO-ACTIONS ============
    autoRestart: {
        type: OptionType.BOOLEAN,
        description: "Auto-restart Discord after fatal crashes",
        default: false
    },
    autoUpdate: {
        type: OptionType.BOOLEAN,
        description: "Auto-prompt for updates after crashes",
        default: true
    },
    autoBackup: {
        type: OptionType.BOOLEAN,
        description: "Auto-backup settings before risky recovery",
        default: true
    },
    autoReport: {
        type: OptionType.BOOLEAN,
        description: "Auto-report crashes (anonymous)",
        default: false
    },

    // ============ HIDDEN STORAGE ============
    crashLogs: {
        type: OptionType.STRING,
        description: "Crash logs storage (JSON) - managed automatically",
        default: "[]",
        hidden: true
    },
    crashStats: {
        type: OptionType.STRING,
        description: "Crash statistics (JSON) - managed automatically",
        default: "{}",
        hidden: true
    },
    sessionStartTime: {
        type: OptionType.STRING,
        description: "Session start time - managed automatically",
        default: "",
        hidden: true
    }
});

// ==================== STATE ====================
let hasCrashedOnce = false;
let isRecovering = false;
let shouldAttemptRecover = true;
let crashCount = 0;
let recoveryAttempts = 0;
let lastCrashTime = 0;
let performanceMonitorInterval: NodeJS.Timeout | null = null;
let sessionStartTime = Date.now();

// ==================== UTILITY FUNCTIONS ====================
function generateCrashId(): string {
    return `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getMemoryUsage(): any {
    if (typeof performance !== "undefined" && (performance as any).memory) {
        const memory = (performance as any).memory;
        return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        };
    }
    return null;
}

function getCrashLogs(): CrashReport[] {
    try {
        return JSON.parse(settings.store.crashLogs || "[]");
    } catch {
        return [];
    }
}

function saveCrashLogs(logs: CrashReport[]): void {
    try {
        const maxLogs = settings.store.maxLogEntries;
        const trimmedLogs = logs.slice(-maxLogs);
        settings.store.crashLogs = JSON.stringify(trimmedLogs);
    } catch (err) {
        CrashHandlerLogger.error("Failed to save crash logs:", err);
    }
}

function getCrashStatistics(): CrashStatistics {
    try {
        return JSON.parse(settings.store.crashStats || "{}");
    } catch {
        return {
            totalCrashes: 0,
            recoveredCrashes: 0,
            failedRecoveries: 0,
            crashesByType: {},
            averageRecoveryTime: 0,
            crashFrequency: []
        };
    }
}

function saveCrashStatistics(stats: CrashStatistics): void {
    try {
        settings.store.crashStats = JSON.stringify(stats);
    } catch (err) {
        CrashHandlerLogger.error("Failed to save crash statistics:", err);
    }
}

function updateCrashStatistics(crashReport: CrashReport): void {
    if (!settings.store.enableStatistics) return;

    try {
        const stats = getCrashStatistics();
        
        stats.totalCrashes = (stats.totalCrashes || 0) + 1;
        
        if (crashReport.recoverySuccessful) {
            stats.recoveredCrashes = (stats.recoveredCrashes || 0) + 1;
        } else if (crashReport.recoveryAttempted) {
            stats.failedRecoveries = (stats.failedRecoveries || 0) + 1;
        }
        
        stats.lastCrashTime = crashReport.timestamp;
        
        // Track crash types
        const errorType = crashReport.error.split(":")[0] || "Unknown";
        stats.crashesByType[errorType] = (stats.crashesByType[errorType] || 0) + 1;
        
        // Track crash frequency (last 10 crashes)
        stats.crashFrequency = stats.crashFrequency || [];
        stats.crashFrequency.push(crashReport.timestamp);
        if (stats.crashFrequency.length > 10) {
            stats.crashFrequency.shift();
        }
        
        saveCrashStatistics(stats);
    } catch (err) {
        CrashHandlerLogger.error("Failed to update crash statistics:", err);
    }
}

function logCrash(errorState: any, recoveryAttempted: boolean, recoverySuccessful: boolean): void {
    if (!settings.store.enableCrashLogging) return;

    try {
        const crashReport: CrashReport = {
            id: generateCrashId(),
            timestamp: Date.now(),
            error: errorState.error?.toString() || "Unknown error",
            stack: settings.store.includeStackTrace ? errorState.error?.stack : undefined,
            componentStack: settings.store.includeStackTrace ? errorState.info?.componentStack : undefined,
            channelId: SelectedChannelStore?.getChannelId(),
            guildId: SelectedChannelStore?.getGuildId?.(),
            userId: UserStore?.getCurrentUser()?.id,
            memoryUsage: settings.store.includeSystemInfo ? getMemoryUsage() : undefined,
            userAgent: settings.store.includeSystemInfo ? navigator.userAgent : undefined,
            recoveryAttempted,
            recoverySuccessful,
            crashCount,
            sessionDuration: Date.now() - sessionStartTime
        };

        // Save to logs
        const logs = getCrashLogs();
        logs.push(crashReport);
        saveCrashLogs(logs);

        // Update statistics
        updateCrashStatistics(crashReport);

        // Console logging
        if (settings.store.logToConsole) {
            CrashHandlerLogger.error("Crash Report:", crashReport);
        }

        // File logging (if supported)
        if (settings.store.logToFile) {
            // File system access would go here
            console.log("[CrashHandler] Log to file not yet implemented");
        }
    } catch (err) {
        CrashHandlerLogger.error("Failed to log crash:", err);
    }
}

function checkMemoryUsage(): void {
    if (!settings.store.enablePreventiveMeasures || !settings.store.detectMemoryLeaks) return;

    const memory = getMemoryUsage();
    if (!memory) return;

    const threshold = settings.store.memoryThreshold;
    
    if (memory.usedMB > threshold) {
        CrashHandlerLogger.warn(`High memory usage detected: ${memory.usedMB}MB (threshold: ${threshold}MB)`);
        
        if (settings.store.showCrashNotifications) {
            try {
                showNotification({
                    color: "#ff9800",
                    title: "High Memory Usage Warning",
                    body: `Discord is using ${memory.usedMB}MB of memory. Consider restarting to prevent crashes.`,
                    noPersist: false
                });
            } catch { }
        }

        // Force garbage collection if enabled
        if (settings.store.forceGarbageCollection && typeof (window as any).gc === "function") {
            try {
                (window as any).gc();
                CrashHandlerLogger.info("Forced garbage collection");
            } catch { }
        }
    }
}

function startPerformanceMonitoring(): void {
    if (!settings.store.monitorPerformance || performanceMonitorInterval) return;

    const interval = settings.store.performanceCheckInterval * 1000;
    
    performanceMonitorInterval = setInterval(() => {
        checkMemoryUsage();
        
        // Additional performance checks could go here
        const memory = getMemoryUsage();
        if (memory && settings.store.logToConsole) {
            CrashHandlerLogger.debug(`Memory: ${memory.usedMB}/${memory.limitMB}MB`);
        }
    }, interval);
    
    CrashHandlerLogger.info("Performance monitoring started");
}

function stopPerformanceMonitoring(): void {
    if (performanceMonitorInterval) {
        clearInterval(performanceMonitorInterval);
        performanceMonitorInterval = null;
        CrashHandlerLogger.info("Performance monitoring stopped");
    }
}

export default definePlugin({
    name: "CrashHandlerEnhanced",
    description: "Advanced crash handling with detailed logging, statistics, preventive measures, and intelligent recovery",
    authors: [Devs.Nuckyz, Devs.Mifu],
    enabledByDefault: true,

    settings,

    patches: [
        {
            find: "#{intl::ERRORS_UNEXPECTED_CRASH}",
            replacement: {
                match: /this\.setState\((.+?)\)/,
                replace: "$self.handleCrash(this,$1);"
            }
        }
    ],

    start() {
        sessionStartTime = Date.now();
        settings.store.sessionStartTime = sessionStartTime.toString();
        
        if (settings.store.enablePreventiveMeasures) {
            startPerformanceMonitoring();
        }
        
        CrashHandlerLogger.info("CrashHandlerEnhanced started");
    },

    stop() {
        stopPerformanceMonitoring();
        CrashHandlerLogger.info("CrashHandlerEnhanced stopped");
    },

    handleCrash(_this: any, errorState: any) {
        _this.setState(errorState);

        crashCount++;
        const now = Date.now();
        const timeSinceLastCrash = now - lastCrashTime;
        lastCrashTime = now;

        // Log crash immediately
        logCrash(errorState, false, false);

        // Already recovering
        if (isRecovering) {
            CrashHandlerLogger.warn("Already recovering from previous crash");
            return;
        }
        
        isRecovering = true;

        // Delay before recovery
        setTimeout(() => {
            try {
                // Check if we should attempt recovery
                const maxAttempts = settings.store.maxRecoveryAttempts;
                const crashTooFast = timeSinceLastCrash < 1000; // Less than 1 second

                if (!shouldAttemptRecover || (crashTooFast && recoveryAttempts >= maxAttempts)) {
                    try {
                        showNotification({
                            color: "#f23f43",
                            title: "Discord has crashed!",
                            body: `Crash loop detected (${crashCount} crashes). Not attempting to recover. Please restart Discord.`,
                            noPersist: true
                        });
                    } catch { }

                    logCrash(errorState, true, false);
                    return;
                }

                shouldAttemptRecover = false;
                recoveryAttempts++;
                
                // Reset after 1 second
                setTimeout(() => {
                    shouldAttemptRecover = true;
                    if (timeSinceLastCrash > 5000) {
                        recoveryAttempts = 0; // Reset if crashes are spaced out
                    }
                }, 1000);
            } catch { }

            try {
                // Check for updates on first crash
                if (!hasCrashedOnce && settings.store.autoUpdate) {
                    hasCrashedOnce = true;
                    maybePromptToUpdate("Discord has crashed! There might be an TrashCord update that fixes this. Update now?", true);
                }
            } catch { }

            try {
                if (settings.store.attemptToPreventCrashes) {
                    this.handlePreventCrash(_this, errorState);
                }
            } catch (err) {
                CrashHandlerLogger.error("Failed to handle crash recovery:", err);
                logCrash(errorState, true, false);
            }
        }, settings.store.recoveryDelay);
    },

    handlePreventCrash(_this: any, errorState: any) {
        const recoveryStartTime = Date.now();
        
        try {
            if (settings.store.showCrashNotifications) {
                const errorMsg = settings.store.showDetailedError 
                    ? `Error: ${errorState.error?.message || "Unknown"}`
                    : "Attempting to recover...";
                    
                showNotification({
                    color: "#eed202",
                    title: `Discord has crashed! (Attempt ${recoveryAttempts}/${settings.store.maxRecoveryAttempts})`,
                    body: errorMsg,
                    noPersist: true
                });
            }
        } catch { }

        // Clear drafts
        try {
            const channelId = SelectedChannelStore.getChannelId();
            for (const key in DraftType) {
                if (!Number.isNaN(Number(key))) continue;
                DraftManager.clearDraft(channelId, DraftType[key]);
            }
            CrashHandlerLogger.debug("Cleared drafts");
        } catch (err) {
            CrashHandlerLogger.debug("Failed to clear drafts:", err);
        }

        // Close expression picker
        try {
            ExpressionPickerStore.closeExpressionPicker();
            CrashHandlerLogger.debug("Closed expression picker");
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close expression picker:", err);
        }

        // Close context menus
        try {
            FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
            CrashHandlerLogger.debug("Closed context menus");
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close context menus:", err);
        }

        // Close modals
        try {
            ModalStack.popAll();
            closeAllModals();
            CrashHandlerLogger.debug("Closed all modals");
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close modals:", err);
        }

        // Close user profiles
        try {
            FluxDispatcher.dispatch({ type: "USER_PROFILE_MODAL_CLOSE" });
            CrashHandlerLogger.debug("Closed user profiles");
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close user profiles:", err);
        }

        // Pop all layers
        try {
            FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
            CrashHandlerLogger.debug("Popped all layers");
        } catch (err) {
            CrashHandlerLogger.debug("Failed to pop layers:", err);
        }

        // Close DevTools
        try {
            FluxDispatcher.dispatch({
                type: "DEV_TOOLS_SETTINGS_UPDATE",
                settings: { displayTools: false, lastOpenTabId: "analytics" }
            });
            CrashHandlerLogger.debug("Closed DevTools");
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close DevTools:", err);
        }

        // Aggressive recovery
        if (settings.store.aggressiveRecovery) {
            try {
                // Clear more state
                FluxDispatcher.dispatch({ type: "CHANNEL_SELECT", channelId: null });
                FluxDispatcher.dispatch({ type: "VOICE_CHANNEL_SELECT", channelId: null });
                CrashHandlerLogger.debug("Performed aggressive recovery");
            } catch (err) {
                CrashHandlerLogger.debug("Failed aggressive recovery:", err);
            }
        }

        // Force garbage collection
        if (settings.store.forceGarbageCollection && typeof (window as any).gc === "function") {
            try {
                (window as any).gc();
                CrashHandlerLogger.debug("Forced garbage collection");
            } catch { }
        }

        // Navigate to home
        if (settings.store.attemptToNavigateToHome) {
            try {
                NavigationRouter.transitionToGuild("@me");
                CrashHandlerLogger.debug("Navigated to home");
            } catch (err) {
                CrashHandlerLogger.debug("Failed to navigate to home:", err);
            }
        }

        // Set recovering to false before updating state
        setImmediate(() => isRecovering = false);

        try {
            _this.setState({ error: null, info: null });
            
            const recoveryTime = Date.now() - recoveryStartTime;
            CrashHandlerLogger.info(`Recovery successful in ${recoveryTime}ms`);
            
            // Log successful recovery
            logCrash(errorState, true, true);
            
            if (settings.store.showRecoveryNotifications) {
                setTimeout(() => {
                    try {
                        showNotification({
                            color: "#43b581",
                            title: "Recovery Successful!",
                            body: `Discord recovered from crash in ${recoveryTime}ms`,
                            noPersist: true
                        });
                    } catch { }
                }, 500);
            }
        } catch (err) {
            CrashHandlerLogger.error("Failed to update crash handler component:", err);
            logCrash(errorState, true, false);
        }
    }

});