/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, Forms, GuildChannelStore, React, RestAPI, useStateFromStores } from "@webpack/common";

// Import settings plugin to add our custom entry
import SettingsPlugin from "../_core/settings";

const QuestsStore = findByPropsLazy("getQuest", "quests");
const RunningGameStore = findStoreLazy("RunningGameStore");
const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");

const logger = new Logger("AutoQuestCompleter");

const settings = definePluginSettings({
    showNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show notifications for quest progress and completion",
        default: true
    }
});

function notify(title: string, body: string) {
    if (settings.store.showNotifications) {
        showNotification({ title, body });
    }
}

interface Quest {
    id: string;
    config: {
        configVersion: number;
        expiresAt: string;
        application: {
            id: string;
            name: string;
        };
        messages: {
            questName: string;
        };
        taskConfig?: TaskConfig;
        taskConfigV2?: TaskConfig;
    };
    userStatus?: {
        enrolledAt: string;
        completedAt?: string;
        progress?: Record<string, { value: number; }>;
    };
}

interface TaskConfig {
    tasks: Record<string, { target: number; } | undefined>;
}

type TaskName = "WATCH_VIDEO" | "PLAY_ON_DESKTOP" | "STREAM_ON_DESKTOP" | "PLAY_ACTIVITY" | "WATCH_VIDEO_ON_MOBILE";

const TASK_TYPES: TaskName[] = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];

// Task types that require the actual activity to send progress - cannot be spoofed
const UNSUPPORTED_TASK_TYPES = ["ACHIEVEMENT_IN_ACTIVITY"];

const DATA_STORE_KEY = "AutoQuestCompleter_skippedQuests";

let activeIntervals: Set<ReturnType<typeof setInterval>> = new Set();
let completedCount = 0;
let skippedCount = 0;
let activeSubscriptions: Map<string, (data: any) => void> = new Map();
let originalFunctions: Map<string, Function> = new Map();
let scanInterval: ReturnType<typeof setInterval> | null = null;
let processingQuests: Set<string> = new Set();
let skippedQuests: Set<string> = new Set(); // Quests we've already determined can't be completed

// Queue for video quests to process them one at a time (avoid rate limits)
let videoQuestQueue: Array<{ quest: Quest; secondsNeeded: number; secondsDone: number; }> = [];
let isProcessingVideoQueue = false;

// Queue for desktop quests - only spoof one game at a time to avoid 500 errors
let desktopQuestQueue: Array<{ quest: Quest; secondsNeeded: number; secondsDone: number; }> = [];
let currentDesktopQuest: Quest | null = null;

async function loadSkippedQuests() {
    const saved = await DataStore.get<string[]>(DATA_STORE_KEY);
    if (saved) {
        skippedQuests = new Set(saved);
        logger.info(`Loaded ${skippedQuests.size} skipped quest(s) from storage`);
    }
}

async function saveSkippedQuests() {
    await DataStore.set(DATA_STORE_KEY, [...skippedQuests]);
}

let totalQuestsInBatch = 0;

function checkAndShowSummary() {
    // Show summary when all quests in the batch are done (completed + skipped = total)
    if (completedCount + skippedCount >= totalQuestsInBatch && totalQuestsInBatch > 0) {
        let message = `Completed ${completedCount} quest(s)`;
        if (skippedCount > 0) {
            message += `, skipped ${skippedCount} (unsupported)`;
        }
        notify("Auto Quest Completer", message);

        // Reset counters for next batch
        completedCount = 0;
        skippedCount = 0;
        totalQuestsInBatch = 0;
    }
}

function getActiveQuests(): Quest[] {
    return [...QuestsStore.quests.values()].filter((x: Quest) =>
        x.id !== "1412491570820812933" &&
        x.userStatus?.enrolledAt &&
        !x.userStatus?.completedAt &&
        new Date(x.config.expiresAt).getTime() > Date.now()
    );
}

function queueVideoQuest(quest: Quest, secondsNeeded: number, secondsDone: number) {
    videoQuestQueue.push({ quest, secondsNeeded, secondsDone });
    logger.info(`Queued video quest: ${quest.config.messages.questName} (${videoQuestQueue.length} in queue)`);
    processVideoQueue();
}

async function processVideoQueue() {
    if (isProcessingVideoQueue || videoQuestQueue.length === 0) return;

    isProcessingVideoQueue = true;

    while (videoQuestQueue.length > 0) {
        const item = videoQuestQueue.shift()!;
        await handleVideoQuestInternal(item.quest, item.secondsNeeded, item.secondsDone);
        // Small delay between quests to avoid rate limits
        if (videoQuestQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    isProcessingVideoQueue = false;
}

async function handleVideoQuestInternal(quest: Quest, secondsNeeded: number, secondsDone: number) {
    const maxFuture = 10, speed = 7, interval = 1;
    const enrolledAt = new Date(quest.userStatus!.enrolledAt).getTime();
    let completed = false;
    let currentProgress = secondsDone;

    const questId = String(quest.id);
    const questName = quest.config.messages.questName;
    logger.info(`Starting video quest: ${questName}`);

    const fn = async () => {
        while (true) {
            const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
            const diff = maxAllowed - currentProgress;
            const timestamp = currentProgress + speed;

            if (diff >= speed) {
                try {
                    const res = await RestAPI.post({
                        url: `/quests/${questId}/video-progress`,
                        body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) }
                    });
                    completed = res?.body?.completed_at != null;
                    currentProgress = Math.min(secondsNeeded, timestamp);
                } catch (err: any) {
                    logger.error(`API Error for ${questName}:`, err?.message ?? err);
                    break;
                }
            }

            if (timestamp >= secondsNeeded) break;
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }

        if (!completed) {
            try {
                await RestAPI.post({
                    url: `/quests/${questId}/video-progress`,
                    body: { timestamp: secondsNeeded }
                });
                logger.info(`Quest "${questName}" completed!`);
                completedCount++;
                checkAndShowSummary();
            } catch (err: any) {
                logger.error(`Failed to complete ${questName}:`, err.message);
            }
        } else {
            logger.info(`Quest "${questName}" completed!`);
            completedCount++;
            checkAndShowSummary();
        }
    };

    await fn();
    logger.info(`Finished video quest: ${questName}`);
}

function queueDesktopQuest(quest: Quest, secondsNeeded: number, secondsDone: number) {
    desktopQuestQueue.push({ quest, secondsNeeded, secondsDone });
    logger.info(`Queued desktop quest: ${quest.config.messages.questName} (${desktopQuestQueue.length} in queue)`);
    processNextDesktopQuest();
}

function processNextDesktopQuest() {
    if (currentDesktopQuest || desktopQuestQueue.length === 0) return;

    const item = desktopQuestQueue.shift()!;
    currentDesktopQuest = item.quest;
    handlePlayOnDesktopQuestInternal(item.quest, item.secondsNeeded, item.secondsDone);
}

async function handlePlayOnDesktopQuestInternal(quest: Quest, secondsNeeded: number, secondsDone: number) {
    const pid = Math.floor(Math.random() * 30000) + 1000;
    const questId = String(quest.id);
    const applicationId = quest.config.application.id;
    const applicationName = quest.config.application.name;
    const questName = quest.config.messages.questName;

    try {
        let appName = applicationName;
        let exeName = "game.exe";

        // Try to fetch app data, but use fallback if not available
        try {
            const res = await RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` });
            const appData = res?.body?.[0];
            if (appData) {
                appName = appData.name || applicationName;
                exeName = appData.executables?.find((x: any) => x.os === "win32")?.name?.replace(">", "") ?? "game.exe";
            } else {
                logger.info(`No public app data for ${applicationName}, using fallback`);
            }
        } catch {
            logger.info(`Could not fetch app data for ${applicationName}, using fallback`);
        }

        const fakeGame = {
            cmdLine: `C:\\Program Files\\${appName}\\${exeName}`,
            exeName,
            exePath: `c:/program files/${appName.toLowerCase()}/${exeName}`,
            hidden: false,
            isLauncher: false,
            id: applicationId,
            name: appName,
            pid: pid,
            pidPath: [pid],
            processName: appName,
            start: Date.now(),
        };

        const realGames = RunningGameStore.getRunningGames();
        const fakeGames = [fakeGame];

        originalFunctions.set("getRunningGames", RunningGameStore.getRunningGames);
        originalFunctions.set("getGameForPID", RunningGameStore.getGameForPID);

        RunningGameStore.getRunningGames = () => fakeGames;
        RunningGameStore.getGameForPID = (pid: number) => fakeGames.find(x => x.pid === pid);

        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

        const fn = (data: any) => {
            const progress = quest.config.configVersion === 1
                ? data.userStatus.streamProgressSeconds
                : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
            logger.info(`${questName} Progress: ${progress}/${secondsNeeded}`);

            if (progress >= secondsNeeded) {
                logger.info(`Quest "${questName}" completed!`);
                completedCount++;
                checkAndShowSummary();

                const realGetRunningGames = originalFunctions.get("getRunningGames");
                const realGetGameForPID = originalFunctions.get("getGameForPID");
                if (realGetRunningGames) RunningGameStore.getRunningGames = realGetRunningGames;
                if (realGetGameForPID) RunningGameStore.getGameForPID = realGetGameForPID;

                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                activeSubscriptions.delete(`play_${questId}`);

                // Process next desktop quest in queue
                currentDesktopQuest = null;
                processNextDesktopQuest();
            }
        };

        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
        activeSubscriptions.set(`play_${questId}`, fn);

        logger.info(`Spoofed game: ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} minutes`);
    } catch (err: any) {
        logger.error(`Error: Could not fetch application data for ${applicationName}`, err);
        // Process next quest even on error
        currentDesktopQuest = null;
        processNextDesktopQuest();
    }
}

async function handleStreamOnDesktopQuest(quest: Quest, secondsNeeded: number, secondsDone: number) {
    const pid = Math.floor(Math.random() * 30000) + 1000;
    const questId = String(quest.id);
    const applicationId = quest.config.application.id;
    const applicationName = quest.config.application.name;
    const questName = quest.config.messages.questName;

    originalFunctions.set("getStreamerActiveStreamMetadata", ApplicationStreamingStore.getStreamerActiveStreamMetadata);

    ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
        id: applicationId,
        pid,
        sourceName: null
    });

    const fn = (data: any) => {
        const progress = quest.config.configVersion === 1
            ? data.userStatus.streamProgressSeconds
            : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
        logger.info(`${questName} Progress: ${progress}/${secondsNeeded}`);

        if (progress >= secondsNeeded) {
            logger.info(`Quest "${questName}" completed!`);
            completedCount++;
            checkAndShowSummary();

            const realFunc = originalFunctions.get("getStreamerActiveStreamMetadata");
            if (realFunc) ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;

            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            activeSubscriptions.delete(`stream_${questId}`);
        }
    };

    FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
    activeSubscriptions.set(`stream_${questId}`, fn);

    logger.info(`Spoofed stream: ${applicationName}. Stream any window in VC for ${Math.ceil((secondsNeeded - secondsDone) / 60)} minutes`);
    logger.info(`Remember: You need at least 1 other person in the VC!`);
}

async function handlePlayActivityQuest(quest: Quest, secondsNeeded: number, secondsDone: number) {
    const questId = String(quest.id);
    const questName = quest.config.messages.questName;

    const guilds = GuildChannelStore.getAllGuilds() as Record<string, any>;
    const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ??
        Object.values(guilds).find(x => x != null && x.VOCAL?.length > 0)?.VOCAL[0]?.channel?.id;

    if (!channelId) {
        logger.error(`Could not find a valid channel for activity quest: ${questName}`);
        return;
    }

    const streamKey = `call:${channelId}:1`;

    logger.info(`Starting activity quest: ${questName}`);

    const fn = async () => {
        while (true) {
            try {
                const res = await RestAPI.post({
                    url: `/quests/${questId}/heartbeat`,
                    body: { stream_key: streamKey, terminal: false }
                });
                const progress = res.body.progress.PLAY_ACTIVITY.value;
                logger.info(`${questName} Progress: ${progress}/${secondsNeeded}`);

                await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                if (progress >= secondsNeeded) {
                    await RestAPI.post({
                        url: `/quests/${questId}/heartbeat`,
                        body: { stream_key: streamKey, terminal: true }
                    });
                    break;
                }
            } catch (err: any) {
                logger.error(`API Error for ${questName}:`, err.message);
                break;
            }
        }

        logger.info(`Quest "${questName}" completed!`);
        completedCount++;
        checkAndShowSummary();
    };

    fn();
}

function processQuest(quest: Quest, index: number, total: number): boolean {
    const questName = quest.config.messages.questName;
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;

    if (!taskConfig || !taskConfig.tasks) {
        logger.warn(`[Quest ${index + 1}/${total}] Skipping: ${questName} - No valid task configuration found.`);
        return false;
    }

    const taskName = TASK_TYPES.find(x => taskConfig.tasks[x] != null);

    if (!taskName) {
        const availableTasks = Object.keys(taskConfig.tasks);
        logger.warn(`[Quest ${index + 1}/${total}] Skipping: ${questName} - No supported task type found. Available: ${availableTasks.join(", ")}`);
        return false;
    }

    const targetValue = taskConfig.tasks[taskName]?.target;
    if (targetValue === undefined) {
        logger.warn(`[Quest ${index + 1}/${total}] Skipping: ${questName} - Task "${taskName}" has no target value.`);
        return false;
    }

    const secondsNeeded = targetValue;
    const secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

    logger.info(`[Quest ${index + 1}/${total}] Processing: ${questName}`);
    logger.info(`Type: ${taskName}, Progress: ${secondsDone}/${secondsNeeded} seconds`);

    const isApp = typeof DiscordNative !== "undefined";

    switch (taskName) {
        case "WATCH_VIDEO":
        case "WATCH_VIDEO_ON_MOBILE":
            queueVideoQuest(quest, secondsNeeded, secondsDone);
            return true;
        case "PLAY_ON_DESKTOP":
            if (!isApp) {
                logger.warn(`Skipping: ${questName} requires Discord Desktop app.`);
                return false;
            } else {
                queueDesktopQuest(quest, secondsNeeded, secondsDone);
                return true;
            }
        case "STREAM_ON_DESKTOP":
            if (!isApp) {
                logger.warn(`Skipping: ${questName} requires Discord Desktop app.`);
                return false;
            } else {
                handleStreamOnDesktopQuest(quest, secondsNeeded, secondsDone);
                return true;
            }
        case "PLAY_ACTIVITY":
            handlePlayActivityQuest(quest, secondsNeeded, secondsDone);
            return true;
        default:
            logger.warn(`Skipping: Unknown quest type "${taskName}"`);
            return false;
    }
}

function scanAndProcessQuests() {
    const quests = getActiveQuests();

    // Filter out quests already being processed or already skipped
    const newQuests = quests.filter(q => !processingQuests.has(q.id) && !skippedQuests.has(q.id));

    if (newQuests.length === 0) return;

    logger.info(`Found ${newQuests.length} new quest(s) to process`);
    newQuests.forEach((quest, index) => {
        logger.info(`${index + 1}. ${quest.config.messages.questName} (ID: ${quest.id})`);
    });

    notify("Auto Quest Completer", `Detected ${newQuests.length} active quest(s)...`);

    // Set batch total for summary tracking
    totalQuestsInBatch = newQuests.length;
    completedCount = 0;
    skippedCount = 0;

    newQuests.forEach(async (quest, index) => {
        const started = processQuest(quest, index, newQuests.length);
        if (started) {
            processingQuests.add(quest.id);
        } else {
            // Mark as skipped so we don't keep trying
            skippedQuests.add(quest.id);
            skippedCount++;
            await saveSkippedQuests();
            checkAndShowSummary();
        }
    });
}

function startAutoScan() {
    if (scanInterval) {
        logger.info("Auto-scan already running");
        return;
    }

    logger.info("Starting auto-scan (every 10 seconds)");
    notify("Auto Quest Completer", "Enabled");

    // Run immediately on start
    scanAndProcessQuests();

    // Then run every 10 seconds
    scanInterval = setInterval(() => {
        scanAndProcessQuests();
    }, 10 * 1000);
}

function stopAutoScan() {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
        logger.info("Auto-scan stopped");
    }
}

function cleanup() {
    stopAutoScan();

    activeIntervals.forEach(interval => clearInterval(interval));
    activeIntervals.clear();

    activeSubscriptions.forEach((fn, key) => {
        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
    });
    activeSubscriptions.clear();

    originalFunctions.forEach((fn, key) => {
        switch (key) {
            case "getRunningGames":
                RunningGameStore.getRunningGames = fn;
                break;
            case "getGameForPID":
                RunningGameStore.getGameForPID = fn;
                break;
            case "getStreamerActiveStreamMetadata":
                ApplicationStreamingStore.getStreamerActiveStreamMetadata = fn;
                break;
        }
    });
    originalFunctions.clear();

    processingQuests.clear();
    videoQuestQueue = [];
    isProcessingVideoQueue = false;
    desktopQuestQueue = [];
    currentDesktopQuest = null;
    // Don't clear skippedQuests - keep them persisted

    logger.info("Cleaned up all active quest completions");
}

function QuestCardComponent() {
    // Force re-render when quest state changes
    const quests = useStateFromStores([QuestsStore], () => getActiveQuests());

    const getQuestStatus = (quest: Quest) => {
        const questId = String(quest.id);
        if (skippedQuests.has(questId)) return "skipped";
        if (currentDesktopQuest?.id === questId) return "processing";
        if (videoQuestQueue.some(q => q.quest.id === questId)) return "queued";
        if (desktopQuestQueue.some(q => q.quest.id === questId)) return "queued";
        if (processingQuests.has(questId)) return "processing";
        return "pending";
    };

    const getProgress = (quest: Quest) => {
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        if (!taskConfig?.tasks) return null;

        const taskName = TASK_TYPES.find(x => taskConfig.tasks[x] != null);
        if (!taskName) return null;

        const target = taskConfig.tasks[taskName]?.target ?? 0;
        const current = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        return { current, target };
    };

    if (quests.length === 0) {
        return (
            <div className="vc-quest-completer-card">
                <div className="vc-quest-completer-header">
                    <span className="vc-quest-completer-title">🎮 Auto Quest Completer</span>
                </div>
                <div className="vc-quest-completer-empty">No active quests</div>
            </div>
        );
    }

    return (
        <div className="vc-quest-completer-card">
            <div className="vc-quest-completer-header">
                <span className="vc-quest-completer-title">🎮 Auto Quest Completer</span>
                <span className="vc-quest-completer-subtitle">{quests.length} quest(s)</span>
            </div>
            {quests.map(quest => {
                const status = getQuestStatus(quest);
                const progress = getProgress(quest);
                const questName = quest.config.messages.questName;

                return (
                    <div key={quest.id} className="vc-quest-completer-quest-item">
                        <span className="vc-quest-completer-quest-name" title={questName}>
                            {questName}
                        </span>
                        {progress && (
                            <span className="vc-quest-completer-progress">
                                {Math.floor(progress.current)}/{progress.target}s
                            </span>
                        )}
                        <span className={`vc-quest-completer-quest-status vc-quest-completer-status-${status}`}>
                            {status === "processing" ? "⚡ Active" :
                                status === "queued" ? "⏳ Queued" :
                                    status === "skipped" ? "⏭️ Skip" :
                                        status === "completed" ? "✅ Done" : "⏸️ Pending"}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// Paused quests tracking
let pausedQuests: Set<string> = new Set();

// Function to stop the current active desktop quest
function stopCurrentDesktopQuest(): Quest | null {
    if (!currentDesktopQuest) return null;

    const questId = String(currentDesktopQuest.id);
    const stoppedQuest = currentDesktopQuest;

    // Unsubscribe from heartbeat
    const subscription = activeSubscriptions.get(`play_${questId}`);
    if (subscription) {
        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", subscription);
        activeSubscriptions.delete(`play_${questId}`);
    }

    // Restore original functions
    const realGetRunningGames = originalFunctions.get("getRunningGames");
    const realGetGameForPID = originalFunctions.get("getGameForPID");
    if (realGetRunningGames) RunningGameStore.getRunningGames = realGetRunningGames;
    if (realGetGameForPID) RunningGameStore.getGameForPID = realGetGameForPID;

    // Dispatch game removal
    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: [], games: [] });

    currentDesktopQuest = null;
    logger.info(`Stopped desktop quest: ${stoppedQuest.config.messages.questName}`);

    return stoppedQuest;
}

// Function to pause a quest (stop it and add to paused set)
function pauseQuest(quest: Quest) {
    const questId = String(quest.id);

    // If this is the current desktop quest, stop it
    if (currentDesktopQuest?.id === questId) {
        stopCurrentDesktopQuest();
    }

    pausedQuests.add(questId);
    logger.info(`Paused quest: ${quest.config.messages.questName}`);
}

// Function to resume/start a quest
function resumeQuest(quest: Quest) {
    const questId = String(quest.id);
    pausedQuests.delete(questId);

    // Get quest progress info
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    if (!taskConfig?.tasks) return;

    const taskName = TASK_TYPES.find(x => taskConfig.tasks[x] != null);
    if (!taskName) return;

    const target = taskConfig.tasks[taskName]?.target ?? 0;
    const current = quest.userStatus?.progress?.[taskName]?.value ?? 0;

    // If it's a desktop quest, stop current and start this one
    if (taskName === "PLAY_ON_DESKTOP") {
        // Stop current desktop quest if any
        const stoppedQuest = stopCurrentDesktopQuest();
        if (stoppedQuest) {
            // Re-queue the stopped quest
            const stoppedTaskConfig = stoppedQuest.config.taskConfig ?? stoppedQuest.config.taskConfigV2;
            const stoppedTarget = stoppedTaskConfig?.tasks?.PLAY_ON_DESKTOP?.target ?? 0;
            const stoppedCurrent = stoppedQuest.userStatus?.progress?.PLAY_ON_DESKTOP?.value ?? 0;
            desktopQuestQueue.push({ quest: stoppedQuest, secondsNeeded: stoppedTarget, secondsDone: stoppedCurrent });
        }

        // Start this quest immediately
        currentDesktopQuest = quest;
        handlePlayOnDesktopQuestInternal(quest, target, current);
    }

    logger.info(`Resumed quest: ${quest.config.messages.questName}`);
}

// SVG Icons
const Icons = {
    Refresh: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor" />
        </svg>
    ),
    Stop: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        </svg>
    ),
    Play: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
        </svg>
    ),
    Pause: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor" />
        </svg>
    ),
    Video: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm6 2.5l6 3.5-6 3.5v-7z" fill="currentColor" />
        </svg>
    ),
    Gamepad: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M21 6H3a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2V8a2 2 0 00-2-2zM11 13H9v2H7v-2H5v-2h2V9h2v2h2v2zm4 2a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-3a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
        </svg>
    ),
    Stream: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm-8 12.5l-6-4v8l6-4zm0-1l6-4-6-4v8z" fill="currentColor" />
        </svg>
    ),
    Activity: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
        </svg>
    ),
    Unknown: (props: any) => (
        <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="currentColor" />
        </svg>
    ),
};

const cl = classNameFactory("vc-quest-");

// Full settings tab component
function QuestTrackerTab() {
    const quests = useStateFromStores([QuestsStore], () => getActiveQuests());
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    const getQuestStatus = (quest: Quest) => {
        const questId = String(quest.id);
        if (pausedQuests.has(questId)) return "paused";
        if (skippedQuests.has(questId)) return "skipped";
        if (currentDesktopQuest?.id === questId) return "active";
        if (isProcessingVideoQueue && videoQuestQueue[0]?.quest.id === questId) return "active";
        if (videoQuestQueue.some(q => q.quest.id === questId)) return "queued";
        if (desktopQuestQueue.some(q => q.quest.id === questId)) return "queued";
        if (processingQuests.has(questId)) return "active";
        return "pending";
    };

    const getProgress = (quest: Quest) => {
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        if (!taskConfig?.tasks) return null;
        const taskName = TASK_TYPES.find(x => taskConfig.tasks[x] != null);
        if (!taskName) return null;
        const target = taskConfig.tasks[taskName]?.target ?? 0;
        const current = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        return { current, target, taskName, percent };
    };

    const handlePauseClick = (quest: Quest) => {
        pauseQuest(quest);
        forceUpdate();
    };

    const handleResumeClick = (quest: Quest) => {
        resumeQuest(quest);
        forceUpdate();
    };

    const handleStartQueuedQuest = (quest: Quest) => {
        // Remove from queue first
        const questId = String(quest.id);
        const desktopIdx = desktopQuestQueue.findIndex(q => q.quest.id === questId);
        if (desktopIdx >= 0) {
            desktopQuestQueue.splice(desktopIdx, 1);
        }
        // Now start it (this will stop current and start this one)
        resumeQuest(quest);
        forceUpdate();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "#3ba55c";
            case "queued": return "#5865f2";
            case "paused": return "#faa61a";
            case "skipped": return "#ed4245";
            default: return "#72767d";
        }
    };

    return (
        <section className="vc-settings-tab">
            <Forms.FormTitle tag="h5" className={Margins.bottom8}>Quick Actions</Forms.FormTitle>
            <Card className={cl("actions-card")}>
                <button className={cl("action-btn")} onClick={() => scanAndProcessQuests()}>
                    <Icons.Refresh size={20} />
                    <span>Scan Quests</span>
                </button>
                <button className={cl("action-btn")} onClick={() => { cleanup(); notify("Auto Quest Completer", "Stopped"); forceUpdate(); }}>
                    <Icons.Stop size={20} />
                    <span>Stop All</span>
                </button>
            </Card>

            <Divider className={Margins.top16 + " " + Margins.bottom16} />

            <Forms.FormTitle tag="h5">Active Quests</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16} style={{ color: "var(--text-muted)" }}>
                Quests are automatically scanned every 10 seconds. Click on a queued quest to prioritize it.
            </Forms.FormText>

            {quests.length === 0 ? (
                <Card className={cl("empty-card")}>
                    <Icons.Gamepad size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
                    <Forms.FormText style={{ fontWeight: 500, color: "var(--header-primary)" }}>No quests found</Forms.FormText>
                    <Forms.FormText style={{ color: "var(--text-muted)" }}>Click "Scan Quests" to check for available quests</Forms.FormText>
                </Card>
            ) : (
                <div className={cl("quest-list")}>
                    {quests.map(quest => {
                        const status = getQuestStatus(quest);
                        const progress = getProgress(quest);
                        const questName = quest.config.messages.questName;
                        const isPaused = pausedQuests.has(String(quest.id));
                        const statusColor = getStatusColor(status);
                        const isSkipped = status === "skipped";
                        const isQueued = status === "queued";
                        const isActive = status === "active";

                        return (
                            <Card key={quest.id} className={cl("quest-card")}>
                                <div className={cl("quest-header")}>
                                    <div className={cl("quest-info")}>
                                        <div className={cl("quest-name")}>{questName}</div>
                                        {!isSkipped && progress && (
                                            <div className={cl("quest-meta")}>
                                                {progress.taskName.replace(/_/g, " ")} • {formatTime(progress.current)} / {formatTime(progress.target)}
                                            </div>
                                        )}
                                    </div>
                                    <div className={cl("quest-actions")}>
                                        {isActive && !isPaused && (
                                            <button
                                                className={cl("icon-btn")}
                                                onClick={() => handlePauseClick(quest)}
                                                title="Pause"
                                            >
                                                <Icons.Pause size={18} />
                                            </button>
                                        )}
                                        {isPaused && (
                                            <button
                                                className={cl("icon-btn")}
                                                onClick={() => handleResumeClick(quest)}
                                                title="Resume"
                                            >
                                                <Icons.Play size={18} />
                                            </button>
                                        )}
                                        {isQueued && (
                                            <button
                                                className={cl("icon-btn")}
                                                onClick={() => handleStartQueuedQuest(quest)}
                                                title="Start this quest now"
                                            >
                                                <Icons.Play size={18} />
                                            </button>
                                        )}
                                        <div className={cl("status")} style={{ color: statusColor }}>
                                            <span className={cl("status-dot")} style={{ background: statusColor }} />
                                            {isSkipped ? "Unsupported" : status}
                                        </div>
                                    </div>
                                </div>

                                {!isSkipped && progress && progress.percent > 0 && (
                                    <div className={cl("progress")}>
                                        <div className={cl("progress-bar")}>
                                            <div
                                                className={cl("progress-fill")}
                                                style={{ width: `${progress.percent}%`, background: statusColor }}
                                            />
                                        </div>
                                        <div className={cl("progress-text")}>
                                            <span>{Math.round(progress.percent)}%</span>
                                            <span>{formatTime(progress.target - progress.current)} left</span>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

// Discord Quest icon for sidebar
function QuestIcon(props: any) {
    return (
        <svg width={props.width ?? 24} height={props.height ?? 24} viewBox="0 0 24 24" fill="none">
            <path fill="currentColor" d="M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z" />
        </svg>
    );
}

export default definePlugin({
    name: "AutoQuestCompleter",
    description: "Automatically completes Discord quests. Scans for new quests every 10 seconds and queues them automatically. Can also be managed in the Auto Quest Completer settings tab!",
    authors: [Devs.Zyhloh],
    settings,

    async start() {
        await loadSkippedQuests();
        logger.info("AutoQuestCompleter started! Auto-scanning for quests...");
        startAutoScan();

        // Add our Auto Quest Completer to the Vencord settings sidebar
        SettingsPlugin.customEntries.push({
            key: "vencord_auto_quest_completer",
            title: "Auto Quest Completer",
            panelTitle: "Auto Quest Completer",
            Component: QuestTrackerTab,
            Icon: QuestIcon
        });
    },

    stop() {
        cleanup();
        // Remove our entry from the settings sidebar
        const idx = SettingsPlugin.customEntries.findIndex(e => e.key === "vencord_auto_quest_completer");
        if (idx !== -1) SettingsPlugin.customEntries.splice(idx, 1);
        logger.info("AutoQuestCompleter stopped!");
    },

    commands: [
        {
            name: "questscan",
            description: "Manually trigger a quest scan",
            execute() {
                scanAndProcessQuests();
            }
        },
        {
            name: "stopquests",
            description: "Stop all active quest completion processes and auto-scan",
            execute() {
                cleanup();
                notify("Auto Quest Completer", "Stopped");
            }
        }
    ]
});
