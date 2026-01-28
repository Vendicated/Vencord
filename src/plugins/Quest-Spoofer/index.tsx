// Made by Reev
// My discord server is https://discord.gg/zmBjcWhu5r

import { definePluginSettings, useSettings } from "@api/Settings";
import definePlugin, { OptionType, SettingsDefinition } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Button, FluxDispatcher, React, Toasts, Forms } from "@webpack/common";

// ========================
// CONSTANTS & TYPES
// ========================

const RunningGameStore = findStoreLazy("RunningGameStore");

interface Quest {
    readonly id: string;
    readonly config: {
        readonly application?: { readonly id: string };
        readonly expiresAt: string;
        readonly messages?: { readonly questName: string };
        readonly taskConfig?: TaskConfig;
        readonly taskConfigV2?: TaskConfig;
    };
    readonly userStatus?: {
        readonly enrolledAt?: string;
        readonly completedAt?: string;
        readonly progress?: Readonly<Record<string, { readonly value: number }>>;
    };
}

interface TaskConfig {
    readonly tasks?: Readonly<Record<string, { readonly target: number }>>;
}

interface GameProcess {
    readonly name: string;
    readonly id: string;
    readonly pid: number;
    readonly start: number;
    readonly executable: string;
    readonly executablePath: string;
    readonly distributor: "steam";
    readonly elevated: boolean;
    readonly platform: 0;
    readonly overlay: boolean;
    readonly hidden: boolean;
    readonly nativeProcessObserverId: number;
    readonly windowHandle: null;
    readonly processName: string;
    readonly isVerified: true;
    readonly steamId: string;
}

interface ApiResponse<T = any> {
    readonly body: T;
    readonly ok: boolean;
    readonly status?: number;
}

interface DiscordApi {
    post: <T>(options: { url: string; body: any; signal?: AbortSignal }) => Promise<ApiResponse<T>>;
    get: <T>(options: { url: string; signal?: AbortSignal }) => Promise<ApiResponse<T>>;
}

enum QuestStatus {
    IDLE = "idle",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    RATE_LIMITED = "rate_limited"
}

// ========================
// SETTINGS
// ========================

const pluginSettingsDefinition = {
    autoSpoof: {
        type: OptionType.BOOLEAN,
        description: "Automatically start spoofing on plugin load",
        default: true,
        hidden: true
    },
    autoEnroll: {
        type: OptionType.BOOLEAN,
        description: "Auto-enroll in newly detected quests",
        default: true,
        hidden: true
    },
    showNotifications: {
        type: OptionType.BOOLEAN,
        description: "Display toast notifications for quest events",
        default: true,
        hidden: true
    },
    concurrentLimit: {
        type: OptionType.NUMBER,
        description: "Maximum concurrent quest runners",
        default: 1,
        hidden: true
    },
    videoProgressSpeed: {
        type: OptionType.NUMBER,
        description: "Video progress increment per cycle (seconds)",
        default: 7,
        hidden: true
    },
    maxFutureOffset: {
        type: OptionType.NUMBER,
        description: "Maximum future timestamp offset (seconds)",
        default: 10,
        hidden: true
    },
    apiTimeout: {
        type: OptionType.NUMBER,
        description: "API request timeout (milliseconds)",
        default: 8000,
        hidden: true
    },
    excludedQuestIds: {
        type: OptionType.STRING,
        description: "Comma-separated list of quest IDs to exclude",
        default: "",
        hidden: true
    },
    debugMode: {
        type: OptionType.BOOLEAN,
        description: "Enable verbose console logging",
        default: false,
        hidden: true
    }
} satisfies SettingsDefinition;

const settings = definePluginSettings(pluginSettingsDefinition);

// ========================
// STATE MANAGEMENT
// ========================

class QuestState {
    private api: DiscordApi | null = null;
    private apiInitialized = false;
    private questStore: any = null;
    private storeInitPromise: Promise<boolean> | null = null;

    public rateLimitUntil = 0;
    public activeRunners = new Map<string, { stop: () => void; timeoutId?: NodeJS.Timeout }>();
    public questQueue: string[] = [];
    public knownQuests = new Set<string>();
    public retryCount = new Map<string, number>();
    public notificationCache = new Map<string, number>();

    private pidCounter = 10000;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private autoRunning = false;

    // Patch management
    private gameProcesses = new Map<number, GameProcess>();
    private originalGetRunningGames: (() => GameProcess[]) | null = null;
    private originalGetGameForPID: ((pid: number) => GameProcess | null) | null = null;

    getNextPid(): number {
        const pid = this.pidCounter++;
        if (this.pidCounter > 99999) this.pidCounter = 10000;
        return pid;
    }

    isAutoRunning(): boolean {
        return this.autoRunning;
    }

    setAutoRunning(val: boolean): void {
        this.autoRunning = val;
    }

    async initializeQuestStore(): Promise<boolean> {
        if (this.questStore) return true;
        if (this.storeInitPromise) return this.storeInitPromise;

        this.storeInitPromise = (async () => {
            try {
                const wpRequire = (globalThis as any).webpackChunkdiscord_app?.push([
                    [Symbol()], {}, (r: any) => r
                ]);
                (globalThis as any).webpackChunkdiscord_app?.pop();

                if (!wpRequire?.c) throw new Error("Webpack modules unavailable");

                const modules = Object.values(wpRequire.c || {}) as any[];
                let storeModule: any = null;

                // Find QuestsStore by looking for getQuest method on any export key
                for (const m of modules) {
                    const exp = m?.exports;
                    if (!exp) continue;

                    for (const key of Object.keys(exp)) {
                        try {
                            const candidate = exp[key];
                            if (candidate?.__proto__?.getQuest || (candidate && typeof candidate.getQuest === "function")) {
                                if (candidate.quests instanceof Map || typeof candidate.quests === "object") {
                                    storeModule = candidate;
                                    Logger.info(`QuestsStore found with export key: ${key}`);
                                    break;
                                }
                            }
                        } catch (e) { /* skip */ }
                    }
                    if (storeModule) break;
                }

                if (!storeModule) throw new Error("QuestsStore not found");

                this.questStore = storeModule;
                Logger.info("QuestsStore initialized successfully");
                return true;
            } catch (e) {
                Logger.error("Failed to initialize QuestsStore", undefined, e);
                return false;
            } finally {
                this.storeInitPromise = null;
            }
        })();

        return this.storeInitPromise;
    }

    getApi(): DiscordApi | null {
        if (this.apiInitialized && this.api) return this.api;

        try {
            const wpRequire = (globalThis as any).webpackChunkdiscord_app?.push([
                [Symbol()], {}, (r: any) => r
            ]);
            (globalThis as any).webpackChunkdiscord_app?.pop();

            if (!wpRequire?.c) throw new Error("Webpack unavailable");

            const modules = Object.values(wpRequire.c || {}) as any[];
            let apiModule: any = null;

            // Find API module by looking for post/get methods on any export key
            for (const m of modules) {
                const exp = m?.exports;
                if (!exp) continue;

                for (const key of Object.keys(exp)) {
                    try {
                        const candidate = exp[key];
                        // Look for HTTP client with post, get, and delete methods
                        if (candidate &&
                            typeof candidate.post === "function" &&
                            typeof candidate.get === "function" &&
                            typeof candidate.delete === "function") {
                            apiModule = candidate;
                            Logger.info(`Discord API found with export key: ${key}`);
                            break;
                        }
                    } catch (e) { /* skip */ }
                }
                if (apiModule) break;
            }

            if (!apiModule || typeof apiModule.post !== "function") {
                throw new Error("Discord API module invalid");
            }

            this.api = apiModule as DiscordApi;
            this.apiInitialized = true;
            Logger.info("Discord API initialized successfully");
            return this.api;
        } catch (e) {
            Logger.error("Failed to initialize Discord API", undefined, e);
            return null;
        }
    }

    getQuestStore(): any {
        return this.questStore;
    }

    applyGamePatch(process: GameProcess): void {
        this.gameProcesses.set(process.pid, process);

        if (this.originalGetRunningGames === null) {
            this.originalGetRunningGames = RunningGameStore.getRunningGames;
        }
        if (this.originalGetGameForPID === null) {
            this.originalGetGameForPID = RunningGameStore.getGameForPID;
        }

        const allProcesses = Array.from(this.gameProcesses.values());
        RunningGameStore.getRunningGames = () => allProcesses;
        RunningGameStore.getGameForPID = (pid: number) => this.gameProcesses.get(pid) ?? null;
    }

    removeGamePatch(pid: number): boolean {
        const existed = this.gameProcesses.delete(pid);

        if (this.gameProcesses.size === 0) {
            this.restorePatches();
        } else if (existed) {
            const allProcesses = Array.from(this.gameProcesses.values());
            RunningGameStore.getRunningGames = () => allProcesses;
            RunningGameStore.getGameForPID = (p: number) => this.gameProcesses.get(p) ?? null;
        }

        return existed;
    }

    private restorePatches(): void {
        if (this.originalGetRunningGames) {
            RunningGameStore.getRunningGames = this.originalGetRunningGames;
            this.originalGetRunningGames = null;
        }
        if (this.originalGetGameForPID) {
            RunningGameStore.getGameForPID = this.originalGetGameForPID;
            this.originalGetGameForPID = null;
        }
    }

    getOriginalGames(): GameProcess[] {
        return this.originalGetRunningGames ? this.originalGetRunningGames() : [];
    }

    setupMemoryCleanup(): void {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);

        this.cleanupInterval = setInterval(() => {
            const now = Date.now();

            // Clear old notifications
            for (const [key, time] of this.notificationCache) {
                if (now - time > 3600000) this.notificationCache.delete(key);
            }

            // Remove completed/expired quests
            if (this.questStore) {
                for (const questId of this.knownQuests) {
                    const quest = this.questStore.quests.get(questId);
                    if (quest?.userStatus?.completedAt ||
                        (quest?.config?.expiresAt && now > Date.parse(quest.config.expiresAt))) {
                        this.knownQuests.delete(questId);
                    }
                }
            }
        }, 300000);
    }

    cleanup(): void {
        this.activeRunners.forEach(r => r.stop());
        this.activeRunners.clear();
        this.questQueue = [];
        this.knownQuests.clear();
        this.retryCount.clear();
        this.notificationCache.clear();
        this.rateLimitUntil = 0;
        this.pidCounter = 10000;
        this.autoRunning = false;

        this.gameProcesses.clear();
        this.restorePatches();

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        Logger.info("State cleanup completed");
    }
}

const state = new QuestState();

// ========================
// LOGGER
// ========================

class Logger {
    private static shouldLog(level: string): boolean {
        return level === "error" || level === "warn" || level === "action" || level === "success" || settings.store.debugMode;
    }

    static log(level: string, message: string, questId?: string, ...args: any[]): void {
        if (!this.shouldLog(level)) return;

        const colors: Record<string, string> = {
            info: "#00d4aa",
            warn: "#ffa500",
            error: "#ff4757",
            action: "#5f27cd",
            success: "#00d2d3"
        };

        const prefix = questId ? `[Quest:${questId.slice(0, 6)}] ` : "";
        console.log(
            `%c[QuestSpoofer]`,
            `color: ${colors[level] || "#fff"}; font-weight: bold;`,
            prefix + message,
            ...args
        );
    }

    static info(msg: string, questId?: string, ...args: any[]): void {
        this.log("info", msg, questId, ...args);
    }

    static warn(msg: string, questId?: string, ...args: any[]): void {
        this.log("warn", msg, questId, ...args);
    }

    static error(msg: string, questId?: string, ...args: any[]): void {
        this.log("error", msg, questId, ...args);
    }

    static action(msg: string, questId?: string, ...args: any[]): void {
        this.log("action", msg, questId, ...args);
    }

    static success(msg: string, questId?: string, ...args: any[]): void {
        this.log("success", msg, questId, ...args);
    }
}

// ========================
// NOTIFICATIONS
// ========================

function showNotification(title: string, body: string, questId?: string): void {
    if (!settings.store.showNotifications) return;

    const key = `${title}:${questId || ""}:${body.slice(0, 30)}`;
    const now = Date.now();

    if (state.notificationCache.has(key) && now - state.notificationCache.get(key)! < 10000) {
        return;
    }

    state.notificationCache.set(key, now);
    Toasts.show({
        message: `${title}: ${body}`,
        id: Toasts.genId(),
        type: Toasts.Type.MESSAGE,
        options: { duration: 5000 }
    });
}

// ========================
// API UTILITIES
// ========================

class ApiError extends Error {
    constructor(public res: ApiResponse, public url: string) {
        super(`API Error ${res.status || "Unknown"}: ${JSON.stringify(res.body)}`);
    }
}

async function safeApiCall<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    context?: string
): Promise<T | null> {
    // Wait if rate limited
    if (Date.now() < state.rateLimitUntil) {
        const waitMs = state.rateLimitUntil - Date.now();
        Logger.warn(`Rate limited - waiting ${Math.round(waitMs / 1000)}s [${context}]`);
        await new Promise(resolve => setTimeout(resolve, waitMs + 200));
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), settings.store.apiTimeout);

        const result = await Promise.race([
            fn(controller.signal),
            new Promise<never>((_, reject) => {
                controller.signal.addEventListener("abort", () =>
                    reject(new Error("API timeout"))
                );
            })
        ]);

        clearTimeout(timeout);
        return result;
    } catch (e: any) {
        Logger.error(`API call failed [${context}]`, undefined, e);

        const status = (e as ApiError)?.res?.status || (e as ApiResponse)?.status;
        const body = (e as ApiError)?.res?.body || (e as ApiResponse)?.body;

        if (status === 429 && body?.retry_after) {
            const retryMs = Math.ceil(body.retry_after * 1000) + 1500;
            state.rateLimitUntil = Date.now() + retryMs;
            Logger.warn(`Rate limit detected - pausing all requests for ${Math.round(retryMs / 1000)}s`);
            showNotification("Rate Limited", `Waiting ${Math.round(retryMs / 1000)}s...`);
        }

        return null;
    }
}

// ========================
// QUEST HELPERS
// ========================

function getQuestName(quest: Quest): string {
    return quest.config.messages?.questName || "Unknown Quest";
}

function getQuestTask(quest: Quest): string | null {
    const config = quest.config.taskConfig ?? quest.config.taskConfigV2;
    return ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "PLAY_ACTIVITY"]
        .find(task => config?.tasks?.[task]) || null;
}

function getQuestProgress(quest: Quest, task: string): number {
    return quest.userStatus?.progress?.[task]?.value ?? 0;
}

function getQuestTarget(quest: Quest, task: string): number {
    const config = quest.config.taskConfig ?? quest.config.taskConfigV2;
    return config?.tasks?.[task]?.target ?? 920;
}

// Helper function to safely get quests from store (matches working version pattern)
function getQuestsArray(store: any): Quest[] {
    if (!store) {
        if (settings.store.debugMode) {
            Logger.warn("Store is null/undefined");
        }
        return [];
    }

    // Try the working version's pattern first: store.quests as property with .values() method
    const quests = store?.quests;
    if (quests?.values) {
        try {
            const questsArray = [...quests.values()] as Quest[];
            if (settings.store.debugMode) {
                Logger.info(`Found ${questsArray.length} quests via store.quests.values()`, undefined, {
                    questIds: questsArray.map(q => q.id),
                    sampleQuest: questsArray[0] ? {
                        id: questsArray[0].id,
                        name: questsArray[0].config?.messages?.questName,
                        enrolled: !!questsArray[0].userStatus?.enrolledAt,
                        completed: !!questsArray[0].userStatus?.completedAt,
                        expires: questsArray[0].config?.expiresAt
                    } : null
                });
            }
            return questsArray;
        } catch (e) {
            Logger.warn("Failed to spread quests.values()", undefined, e);
        }
    }

    // Fallback: If quests is a function, call it first
    if (typeof store.quests === "function") {
        try {
            const questsData = store.quests();
            if (questsData?.values) {
                const questsArray = [...questsData.values()] as Quest[];
                if (settings.store.debugMode) {
                    Logger.info(`Found ${questsArray.length} quests via store.quests().values()`);
                }
                return questsArray;
            }
            // If result is an object, try Object.values
            if (typeof questsData === "object" && !(questsData instanceof Map)) {
                const questsArray = Object.values(questsData).filter((q: any): q is Quest =>
                    q != null && typeof q === "object" && q.id && q.config
                ) as Quest[];
                if (settings.store.debugMode) {
                    Logger.info(`Found ${questsArray.length} quests via store.quests() -> Object.values()`);
                }
                return questsArray;
            }
        } catch (e) {
            Logger.warn("Failed to call store.quests()", undefined, e);
        }
    }

    // Fallback: Direct property access
    if (store.quests && typeof store.quests === "object") {
        if (store.quests instanceof Map) {
            const questsArray = Array.from(store.quests.values()) as Quest[];
            if (settings.store.debugMode) {
                Logger.info(`Found ${questsArray.length} quests via Map.values()`);
            }
            return questsArray;
        }

        // Try Object.values as last resort
        const questsArray = Object.values(store.quests).filter((q: any): q is Quest =>
            q != null && typeof q === "object" && q.id && q.config
        ) as Quest[];
        if (settings.store.debugMode) {
            Logger.info(`Found ${questsArray.length} quests via Object.values()`);
        }
        return questsArray;
    }

    if (settings.store.debugMode) {
        Logger.warn("Unable to extract quests from store", undefined, {
            hasQuests: !!store.quests,
            questsType: typeof store.quests,
            questsIsMap: store.quests instanceof Map,
            hasValues: typeof store.quests?.values === "function"
        });
    }

    return [];
}

// Helper function to safely get a quest by ID from store (handles both Map and object)
function getQuestById(store: any, questId: string): Quest | undefined {
    if (!store) return undefined;

    // If quests is a function, call it first
    let questsObj: any = null;
    if (typeof store.quests === "function") {
        try {
            questsObj = store.quests();
        } catch (e) {
            Logger.warn("Failed to call store.quests() in getQuestById", questId, e);
            return undefined;
        }
    } else {
        questsObj = store.quests;
    }

    if (!questsObj) return undefined;

    // Try Map.get() first
    if (questsObj instanceof Map || typeof questsObj.get === "function") {
        try {
            return questsObj.get(questId);
        } catch (e) {
            Logger.warn("Failed to get quest using .get()", questId, e);
        }
    }

    // Fallback to object access
    if (typeof questsObj === "object") {
        return questsObj[questId];
    }

    return undefined;
}

function getActiveQuests(): Quest[] {
    const store = state.getQuestStore();
    if (!store?.quests) return [];

    const excludedIds = new Set(
        settings.store.excludedQuestIds
            .split(",")
            .map(s => s.trim())
            .filter(s => s.length > 0)
    );

    const now = Date.now();
    return getQuestsArray(store).filter(q => {
        if (!q || !q.userStatus?.enrolledAt || q.userStatus?.completedAt) return false;
        if (now > Date.parse(q.config.expiresAt)) return false;
        if (excludedIds.has(q.id)) return false;
        return true;
    });
}

function getAvailableQuests(): Quest[] {
    const store = state.getQuestStore();
    if (!store?.quests) return [];

    const allQuests = getQuestsArray(store);
    const now = Date.now();

    const available = allQuests.filter(q => {
        if (!q) return false;
        if (q.userStatus?.enrolledAt) return false;
        if (now > Date.parse(q.config.expiresAt)) return false;
        return true;
    });

    if (settings.store.debugMode && allQuests.length > 0) {
        Logger.info(`getAvailableQuests: ${allQuests.length} total, ${available.length} available`, undefined, {
            total: allQuests.length,
            available: available.length,
            enrolled: allQuests.filter(q => q?.userStatus?.enrolledAt).length,
            expired: allQuests.filter(q => q && now > Date.parse(q.config.expiresAt)).length,
            availableIds: available.map(q => q.id),
            allIds: allQuests.map(q => q.id)
        });
    }

    return available;
}

async function enrollInQuest(quest: Quest): Promise<void> {
    const api = state.getApi();
    if (!api) return;

    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const preferredTask = taskConfig?.tasks?.PLAY_ON_DESKTOP
        ? "PLAY_ON_DESKTOP"
        : taskConfig?.tasks?.WATCH_VIDEO
            ? "WATCH_VIDEO"
            : null;

    const body: { task_id?: string; location: number } = { location: 0 };
    if (preferredTask) body.task_id = preferredTask;

    Logger.action(`Enrolling in quest: ${getQuestName(quest)}`, quest.id);

    const res = await safeApiCall(
        signal => api.post({ url: `/quests/${quest.id}/enroll`, body, signal }),
        `enroll-${quest.id.slice(0, 6)}`
    );

    if (res) {
        Logger.success(`Enrolled successfully`, quest.id);
        showNotification("Quest Enrolled", getQuestName(quest), quest.id);
    } else {
        Logger.warn(`Enrollment failed`, quest.id);
    }
}

// ========================
// QUEST RUNNERS
// ========================

function createQuestRunner(questId: string): (() => void) | null {
    const store = state.getQuestStore();
    if (!store) return null;

    const quest = getQuestById(store, questId);
    if (!quest || !quest.userStatus?.enrolledAt) return null;

    const task = getQuestTask(quest);
    if (!task) {
        Logger.warn(`No supported task found for quest`, questId);
        return null;
    }

    const name = getQuestName(quest);
    const target = getQuestTarget(quest, task);

    // Check retry limit
    const attempts = (state.retryCount.get(questId) || 0) + 1;
    if (attempts > 3) {
        Logger.error(`Max retries exceeded`, questId);
        showNotification("Quest Failed", `${name} - Too many retries`, questId);
        state.retryCount.delete(questId);
        return null;
    }

    state.retryCount.set(questId, attempts);
    Logger.action(`Starting quest runner [${task}] - Attempt ${attempts}/${3}`, questId);

    if (attempts === 1) {
        showNotification("Quest Started", name, questId);
    }

    let stopped = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let intervalId: NodeJS.Timeout | undefined;

    const stop = (retry = false) => {
        if (stopped) return;
        stopped = true;

        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);

        state.activeRunners.delete(questId);
        Logger.info(`Runner stopped - Retry: ${retry}`, questId);

        if (retry) {
            const delay = Math.min(2000 * Math.pow(2, attempts), 30000);
            Logger.warn(`Retrying in ${Math.round(delay / 1000)}s`, questId);
            setTimeout(() => enqueueQuest(questId), delay);
        } else {
            processQueue();
        }
    };

    // VIDEO TASK
    if (task.includes("WATCH_VIDEO")) {
        const api = state.getApi();
        if (!api) return null;

        const enrolledTime = new Date(quest.userStatus.enrolledAt!).getTime();
        let progress = getQuestProgress(quest, task);

        const sendProgress = async () => {
            try {
                const now = Date.now();
                const elapsedSinceEnroll = Math.floor((now - enrolledTime) / 1000);
                const maxTimestamp = elapsedSinceEnroll + settings.store.maxFutureOffset;
                const remaining = maxTimestamp - progress;

                if (remaining < settings.store.videoProgressSpeed) {
                    if (progress >= target) {
                        Logger.success(`Video quest completed`, questId);
                        showNotification("Quest Completed", name, questId);
                        stop();
                    }
                    return;
                }

                const increment = Math.min(settings.store.videoProgressSpeed, remaining);
                const newTimestamp = Math.min(target, progress + increment);

                const res = await safeApiCall(
                    signal => api.post({
                        url: `/quests/${questId}/video-progress`,
                        body: { timestamp: newTimestamp },
                        signal
                    }),
                    `video-${questId.slice(0, 6)}`
                );

                if (!res?.ok) throw new Error("Invalid API response");

                progress = newTimestamp;
                state.retryCount.set(questId, 0);

                if (progress >= target) {
                    Logger.success(`Video quest completed`, questId);
                    showNotification("Quest Completed", name, questId);
                    stop();
                }
            } catch (e) {
                Logger.error(`Video progress failed`, questId, e);
                stop(true);
            }
        };

        void sendProgress();
        intervalId = setInterval(() => void sendProgress(), 1000);

        state.activeRunners.set(questId, { stop, timeoutId });
        return stop;
    }

    // GAME TASK
    if (task === "PLAY_ON_DESKTOP") {
        if (!quest.config.application?.id) {
            Logger.warn(`Missing application ID`, questId);
            return null;
        }

        const pid = state.getNextPid();
        const appId = quest.config.application.id;
        const safeName = name.replace(/[^a-z0-9]/gi, "");
        const exe = `${safeName}.exe`;

        const process: GameProcess = {
            name,
            id: appId,
            pid,
            start: Date.now() - 600000,
            executable: exe,
            executablePath: `C:\\Program Files\\${safeName}\\${exe}`,
            distributor: "steam",
            elevated: false,
            platform: 0,
            overlay: false,
            hidden: false,
            nativeProcessObserverId: pid,
            windowHandle: null,
            processName: exe.toLowerCase(),
            isVerified: true,
            steamId: appId
        };

        const previousGames = state.getOriginalGames();
        state.applyGamePatch(process);

        try {
            FluxDispatcher.dispatch({
                type: "RUNNING_GAMES_CHANGE",
                runningGames: RunningGameStore.getRunningGames(),
                added: [process],
                removed: [],
                previousGames
            });
        } catch (e) {
            Logger.error(`Failed to dispatch game change`, questId, e);
            state.removeGamePatch(pid);
            stop(true);
            return null;
        }

        let progress = getQuestProgress(quest, task);

        const listener = (data: any) => {
            if (data?.quest?.id !== questId) return;

            const newProgress = getQuestProgress(data.quest, task);
            if (newProgress > progress) {
                progress = newProgress;
                state.retryCount.set(questId, 0);

                if (progress >= target) {
                    Logger.success(`Game quest completed`, questId);
                    showNotification("Quest Completed", name, questId);
                    stopGame();
                }
            }
        };

        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", listener);

        const stopGame = (retry = false) => {
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", listener);

            const removed = state.removeGamePatch(pid);
            if (removed) {
                try {
                    FluxDispatcher.dispatch({
                        type: "RUNNING_GAMES_CHANGE",
                        runningGames: state.getOriginalGames(),
                        added: [],
                        removed: [process],
                        previousGames: [...state.getOriginalGames(), process]
                    });
                } catch (e) {
                    Logger.warn(`Failed to dispatch game removal`, questId, e);
                }
            }

            stop(retry);
        };

        timeoutId = setTimeout(() => {
            if (progress === 0) {
                Logger.error(`Game timeout - no progress`, questId);
                stopGame(true);
            }
        }, 180000);

        state.activeRunners.set(questId, { stop: stopGame, timeoutId });
        return stopGame;
    }

    return null;
}

// ========================
// QUEUE MANAGEMENT
// ========================

function enqueueQuest(questId: string): void {
    if (state.questQueue.includes(questId) || state.activeRunners.has(questId)) {
        return;
    }

    state.questQueue.push(questId);
    processQueue();
}

function processQueue(): void {
    const limit = settings.store.concurrentLimit;

    while (state.activeRunners.size < limit && state.questQueue.length > 0) {
        const questId = state.questQueue.shift()!;
        const stopFn = createQuestRunner(questId);

        if (!stopFn) {
            state.retryCount.delete(questId);
        }
    }
}

// ========================
// AUTO SPOOF
// ========================

async function autoSpoof(): Promise<void> {
    if (state.isAutoRunning()) {
        Logger.warn("autoSpoof already running");
        return;
    }

    state.setAutoRunning(true);

    try {
        if (!state.getQuestStore() && !(await state.initializeQuestStore())) {
            setTimeout(autoSpoof, 5000);
            return;
        }

        // Auto-enroll
        if (settings.store.autoEnroll) {
            const available = getAvailableQuests();
            if (available.length > 0) {
                Logger.action(`Found ${available.length} new quests to enroll`);

                for (const quest of available) {
                    await enrollInQuest(quest);
                    if (Date.now() < state.rateLimitUntil) break;
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        // Wait if rate limited
        if (Date.now() < state.rateLimitUntil) {
            setTimeout(autoSpoof, state.rateLimitUntil - Date.now() + 1000);
            return;
        }

        // Check for available quests first (for debugging)
        const allQuests = getQuestsArray(state.getQuestStore());
        const availableQuests = getAvailableQuests();
        const activeQuests = getActiveQuests();

        if (settings.store.debugMode) {
            Logger.info(`Quest status: ${allQuests.length} total, ${availableQuests.length} available, ${activeQuests.length} active`);
        }

        if (activeQuests.length === 0) {
            // If we have available quests but auto-enroll is off, log it
            if (availableQuests.length > 0 && !settings.store.autoEnroll) {
                Logger.info(`Found ${availableQuests.length} quest(s) available but auto-enroll is disabled`);
            } else if (state.knownQuests.size === 0 && allQuests.length === 0) {
                Logger.info("No quests found in store");
            } else if (state.knownQuests.size === 0) {
                Logger.info(`No active quests found (${allQuests.length} total quests in store, ${availableQuests.length} available to enroll)`);
            }

            if (state.knownQuests.size === 0 && allQuests.length === 0) {
                showNotification("No Quests", "No quests detected in store");
            }
            setTimeout(autoSpoof, 10000);
            return;
        }

        const newQuests = activeQuests.filter(q => !state.knownQuests.has(q.id));

        if (newQuests.length > 0) {
            newQuests.forEach(q => {
                state.knownQuests.add(q.id);
                enqueueQuest(q.id);
            });

            Logger.action(`Queued ${newQuests.length} new quest(s)`);
            showNotification("New Quests", `${newQuests.length} quest(s) added to queue`);
        }

        processQueue();
        setTimeout(autoSpoof, 15000);
    } finally {
        state.setAutoRunning(false);
    }
}

// ========================
// PREMIUM UI COMPONENT
// ========================

function ControlPanel() {
    const pluginSettings = settings.use();
    const updateSettings = (updates: Partial<typeof settings.store>) => {
        Object.assign(settings.store, updates);
    };
    const [status, setStatus] = React.useState<QuestStatus>(QuestStatus.IDLE);
    const [stats, setStats] = React.useState({
        activeQuests: 0,
        queuedQuests: 0,
        runningQuests: 0,
        completedQuests: 0
    });

    const [currentQuest, setCurrentQuest] = React.useState<{
        name: string;
        progress: number;
        target: number;
        task: string;
    } | null>(null);

    const containerRef = React.useRef<HTMLDivElement | null>(null);

    // Extract Forms components safely - try multiple possible names
    const FormSwitch = (Forms as any).Switch
        || (Forms as any).FormSwitch
        || (Forms as any).FormItem?.Switch
        || null;
    const FormSlider = (Forms as any).Slider
        || (Forms as any).FormSlider
        || (Forms as any).FormItem?.Slider
        || null;
    const FormTextInput = (Forms as any).TextInput
        || (Forms as any).FormTextInput
        || (Forms as any).FormItem?.TextInput
        || null;

    // Create fallback components if Forms components are not available
    const SafeFormSwitch = FormSwitch || ((props: { checked: boolean; onChange: (val: boolean) => void }) => (
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input
                type="checkbox"
                checked={props.checked}
                onChange={(e) => props.onChange(e.target.checked)}
                style={{
                    width: 40,
                    height: 20,
                    borderRadius: 10,
                    appearance: "none",
                    backgroundColor: props.checked ? "#667eea" : "rgba(255, 255, 255, 0.2)",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background-color 0.2s"
                }}
            />
        </label>
    ));

    const SafeFormSlider = FormSlider || React.memo((props: {
        initialValue: number;
        minValue: number;
        maxValue: number;
        markers?: number[];
        stickToMarkers?: boolean;
        onValueChange: (val: number) => void;
    }) => {
        const [value, setValue] = React.useState(props.initialValue);

        // Sync with prop changes
        React.useEffect(() => {
            setValue(props.initialValue);
        }, [props.initialValue]);

        return (
            <div>
                <input
                    type="range"
                    min={props.minValue}
                    max={props.maxValue}
                    value={value}
                    onChange={(e) => {
                        const newVal = Number(e.target.value);
                        setValue(newVal);
                        props.onValueChange(newVal);
                    }}
                    style={{ width: "100%" }}
                />
                <div style={{ textAlign: "center", marginTop: 4, color: "rgba(255, 255, 255, 0.7)" }}>
                    {value}
                </div>
            </div>
        );
    });

    const SafeFormTextInput = FormTextInput || ((props: {
        value: string;
        onChange: (val: string) => void;
        placeholder?: string;
    }) => (
        <input
            type="text"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 4,
                borderBottom: "1px solid #3f3f46",
                background: "rgba(255, 255, 255, 0.05)",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 14
            }}
        />
    ));

    // Log warning if using fallbacks (only once)
    React.useEffect(() => {
        if (!FormSwitch || !FormSlider || !FormTextInput) {
            Logger.warn("Using fallback form components", undefined, {
                availableFormsKeys: Object.keys(Forms || {}),
                usingFallbackSwitch: !FormSwitch,
                usingFallbackSlider: !FormSlider,
                usingFallbackTextInput: !FormTextInput
            });
        }
    }, []); // Only log once on mount

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const aboutSection = container.closest("section");
        const aboutWrapper = aboutSection?.parentElement as HTMLElement | null;
        const modalContent = aboutWrapper?.parentElement as HTMLElement | null;

        const infoSection = aboutWrapper?.previousElementSibling as HTMLElement | null;
        const settingsSection = aboutWrapper?.nextElementSibling as HTMLElement | null;

        const previousStyles = {
            infoDisplay: infoSection?.style.display ?? "",
            settingsDisplay: settingsSection?.style.display ?? "",
            wrapperMarginTop: aboutWrapper?.style.marginTop ?? "",
            contentPadding: modalContent?.style.padding ?? "",
            contentOverflowX: modalContent?.style.overflowX ?? "",
            contentOverflowY: modalContent?.style.overflowY ?? ""
        };

        if (infoSection) infoSection.style.display = "none";
        if (settingsSection) settingsSection.style.display = "none";
        if (aboutWrapper) aboutWrapper.style.marginTop = "0";
        if (modalContent) {
            modalContent.style.padding = "0";
            modalContent.style.overflowX = "hidden";
            modalContent.style.overflowY = "auto";
        }

        return () => {
            if (infoSection) infoSection.style.display = previousStyles.infoDisplay;
            if (settingsSection) settingsSection.style.display = previousStyles.settingsDisplay;
            if (aboutWrapper) aboutWrapper.style.marginTop = previousStyles.wrapperMarginTop;
            if (modalContent) {
                modalContent.style.padding = previousStyles.contentPadding;
                modalContent.style.overflowX = previousStyles.contentOverflowX;
                modalContent.style.overflowY = previousStyles.contentOverflowY;
            }
        };
    }, []);

    React.useEffect(() => {
        const interval = setInterval(() => {
            try {
                const active = getActiveQuests();
                const queued = state.questQueue.length;
                const running = state.activeRunners.size;

                setStats({
                    activeQuests: active.length,
                    queuedQuests: queued,
                    runningQuests: running,
                    completedQuests: state.knownQuests.size - active.length
                });

                if (running > 0) {
                    const [questId] = [...state.activeRunners.keys()];
                    const store = state.getQuestStore();
                    const quest = getQuestById(store, questId);

                    if (quest) {
                        const task = getQuestTask(quest);
                        if (task) {
                            setCurrentQuest({
                                name: getQuestName(quest),
                                progress: getQuestProgress(quest, task),
                                target: getQuestTarget(quest, task),
                                task
                            });
                        }
                    }
                } else {
                    setCurrentQuest(null);
                }

                if (running > 0) {
                    setStatus(QuestStatus.RUNNING);
                } else if (Date.now() < state.rateLimitUntil) {
                    setStatus(QuestStatus.RATE_LIMITED);
                } else if (queued > 0) {
                    setStatus(QuestStatus.IDLE);
                } else {
                    setStatus(QuestStatus.IDLE);
                }
            } catch (error) {
                Logger.warn("Error updating UI stats", undefined, error);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleStart = () => {
        if (status === QuestStatus.RUNNING) return;
        setStatus(QuestStatus.RUNNING);
        void autoSpoof();
        showNotification("Started", "Quest automation is now running");
    };

    const handleStop = () => {
        state.cleanup();
        setStatus(QuestStatus.IDLE);
        setCurrentQuest(null);
        showNotification("Stopped", "Quest automation has been stopped");
    };

    const handleReset = () => {
        state.retryCount.clear();
        showNotification("Reset", "Retry counters have been cleared");
    };

    const progressPercent = currentQuest
        ? Math.min(100, (currentQuest.progress / currentQuest.target) * 100)
        : 0;

    return (
        <div ref={containerRef} style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.logo}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="#18181b" />
                            <path
                                d="M16 8L20 12L16 16L12 12L16 8Z M8 16L12 20L16 16L12 12L8 16Z M24 16L20 12L16 16L20 20L24 16Z M16 24L12 20L16 16L20 20L16 24Z"
                                fill="#ffffff"
                                opacity="0.9"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 style={styles.title}>Quest Spoofer</h2>
                        <p style={styles.subtitle}>Advanced Quest Automation System</p>
                    </div>
                </div>
                <div style={styles.statusBadge(status)}>
                    <div style={styles.statusDot(status)} />
                    {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                </div>
            </div>

            {/* Stats Grid */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon("#5865f2")}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="#ffffff">
                            <path d="M10 2L12 8H18L13 12L15 18L10 14L5 18L6 12H2L10 2Z" />
                        </svg>
                    </div>
                    <div>
                        <div style={styles.statValue}>{stats.activeQuests}</div>
                        <div style={styles.statLabel}>Active Quests</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={styles.statIcon("#faa61a")}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="#ffffff">
                            <path d="M4 4H16V6H4V4Z M4 8H16V10H4V8Z M4 12H16V14H4V12Z" />
                        </svg>
                    </div>
                    <div>
                        <div style={styles.statValue}>{stats.queuedQuests}</div>
                        <div style={styles.statLabel}>In Queue</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={styles.statIcon("#3ba55d")}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="#ffffff">
                            <circle cx="10" cy="10" r="8" fill="none" stroke="#ffffff" strokeWidth="2" />
                            <path d="M10 6V10L13 13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div>
                        <div style={styles.statValue}>{stats.runningQuests}</div>
                        <div style={styles.statLabel}>Running</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={styles.statIcon("#3498db")}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="#ffffff">
                            <path d="M10 2L17 15H1L10 2Z M10 6V10 M10 12V13" stroke="#ffffff" strokeWidth="2" fill="none" />
                        </svg>
                    </div>
                    <div>
                        <div style={styles.statValue}>{stats.completedQuests}</div>
                        <div style={styles.statLabel}>Completed</div>
                    </div>
                </div>
            </div>

            {/* Current Quest Progress */}
            {currentQuest && (
                <div style={styles.progressCard}>
                    <div style={styles.progressHeader}>
                        <div>
                            <div style={styles.progressTitle}>{currentQuest.name}</div>
                            <div style={styles.progressSubtitle}>
                                Task: {currentQuest.task.replace(/_/g, " ")}
                            </div>
                        </div>
                        <div style={styles.progressStats}>
                            <span style={styles.progressValue}>
                                {currentQuest.progress}s
                            </span>
                            <span style={styles.progressSeparator}>/</span>
                            <span style={styles.progressTarget}>
                                {currentQuest.target}s
                            </span>
                        </div>
                    </div>
                    <div style={styles.progressBarContainer}>
                        <div style={styles.progressBarBg}>
                            <div
                                style={{
                                    ...styles.progressBarFill,
                                    width: `${progressPercent}%`
                                }}
                            />
                        </div>
                        <div style={styles.progressPercent}>
                            {Math.round(progressPercent)}%
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div style={styles.actions}>
                <Button
                    onClick={handleStart}
                    disabled={status === QuestStatus.RUNNING}
                    color={Button.Colors.BRAND}
                    size={Button.Sizes.LARGE}
                    style={styles.primaryButton}
                >
                    {status === QuestStatus.RUNNING ? (
                        <>
                            <div style={styles.spinner} />
                            Running ({stats.runningQuests})
                        </>
                    ) : (
                        `Start Automation (${stats.activeQuests})`
                    )}
                </Button>

                <Button
                    onClick={handleStop}
                    disabled={status === QuestStatus.IDLE && stats.runningQuests === 0}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.LARGE}
                    style={styles.secondaryButton}
                >
                    Stop All
                </Button>

                <Button
                    onClick={handleReset}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.LARGE}
                    style={styles.secondaryButton}
                >
                    Reset Retries
                </Button>
            </div>

            {/* Settings Section */}
            <div style={styles.settingsHeader}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="#ffffff" style={{ marginRight: 8, color: "#a1a1aa" }}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M18.6667 10.7417L18.4682 10.7121C18.4357 10.4354 18.3842 10.1633 18.3142 9.89748L18.421 9.70993L19.8285 8.24357L18.4143 6.82936L17.068 8.17565L16.883 8.0707C16.619 7.93514 16.3396 7.82014 16.048 7.7283L16.0123 7.52551L15.7417 6H14.2584L13.9877 7.52551L13.952 7.7283C13.6605 7.82014 13.381 7.93514 13.1171 8.0707L12.932 8.17565L11.5858 6.82936L10.1716 8.24357L11.579 9.70993L11.6858 9.89748C11.6159 10.1633 11.5644 10.4354 11.5318 10.7121L11.3334 10.7417L11.2584 12.2417L11.3334 12.7417L11.5318 12.7712C11.5644 13.0479 11.6159 13.32 11.6858 13.5858L11.579 13.7734L10.1716 15.2397L11.5858 16.6539L12.932 15.3076L13.1171 15.4126C13.381 15.5481 13.6605 15.6631 13.952 15.7549L13.9877 15.9577L14.2584 17.4832H15.7417L16.0123 15.9577L16.048 15.7549C16.3396 15.6631 16.619 15.5481 16.883 15.4126L17.068 15.3076L18.4143 16.6539L19.8285 15.2397L18.421 13.7734L18.3142 13.5858C18.3842 13.32 18.4357 13.0479 18.4682 12.7712L18.6667 12.7417L18.7417 11.4917L18.6667 10.7417ZM17.1667 11.5C17.112 12.012 16.9749 12.4996 16.761 12.9463L16.602 13.3283L16.9082 13.5709L17.5858 14.2485L17.1312 14.7031L16.4291 14.001L16.052 13.8447C15.586 14.0694 15.0782 14.2119 14.5584 14.2638L14.5 14.2708L14.4584 14.3125L14.2417 15.9832H13.7584L13.5417 14.3125L13.5 14.2708L13.4417 14.2638C12.9218 14.2119 12.414 14.0694 11.948 13.8447L11.5709 14.001L10.8688 14.7031L10.4143 14.2485L11.0918 13.5709L11.398 13.3283L11.239 12.9463C11.0252 12.4996 10.888 12.012 10.8334 11.5L10.8263 11.4417L10.7846 11.4H10.5167V10.9H10.7846L10.8263 10.5583L10.8334 10.5C10.888 9.98798 11.0252 9.50036 11.239 9.05369L11.398 8.67167L11.0918 8.42906L10.4143 7.75147L10.8688 7.29688L11.5709 7.99901L11.948 8.15533C12.414 7.93056 12.9218 7.78807 13.4417 7.73617L13.5 7.72917L13.5417 7.6875L13.7584 6.01675H14.2417L14.4584 7.6875L14.5 7.72917L14.5584 7.73617C15.0782 7.78807 15.586 7.93056 16.052 8.15533L16.4291 7.99901L17.1312 7.29688L17.5858 7.75147L16.9082 8.42906L16.602 8.67167L16.761 9.05369C16.9749 9.50036 17.112 9.98798 17.1667 10.5L17.1737 10.5583L17.2154 10.6H17.4834V10.9H17.2154L17.1737 11.4417L17.1667 11.5Z" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12ZM10 13C8.34315 13 7 11.6569 7 10C7 8.34315 8.34315 7 10 7C11.6569 7 13 8.34315 13 10C13 11.6569 11.6569 13 10 13Z" />
                </svg>
                <h3 style={styles.title}>Settings</h3>
            </div>
            <div style={styles.settingsGrid}>
                {/* Boolean Toggles */}
                <div style={styles.settingCard}>
                    <div style={styles.settingText}>
                        <div style={styles.settingLabel}>Auto-Start Spoofing</div>
                        <div style={styles.settingDescription}>Automatically start spoofing on plugin load.</div>
                    </div>
                    <SafeFormSwitch
                        checked={pluginSettings.autoSpoof}
                        onChange={(val: boolean) => updateSettings({ autoSpoof: val })}
                    />
                </div>
                <div style={styles.settingCard}>
                    <div style={styles.settingText}>
                        <div style={styles.settingLabel}>Auto-Enroll Quests</div>
                        <div style={styles.settingDescription}>Automatically enroll in new quests.</div>
                    </div>
                    <SafeFormSwitch
                        checked={pluginSettings.autoEnroll}
                        onChange={(val: boolean) => updateSettings({ autoEnroll: val })}
                    />
                </div>
                <div style={styles.settingCard}>
                    <div style={styles.settingText}>
                        <div style={styles.settingLabel}>Show Notifications</div>
                        <div style={styles.settingDescription}>Display toast notifications for quest events.</div>
                    </div>
                    <SafeFormSwitch
                        checked={pluginSettings.showNotifications}
                        onChange={(val: boolean) => updateSettings({ showNotifications: val })}
                    />
                </div>
                <div style={styles.settingCard}>
                    <div style={styles.settingText}>
                        <div style={styles.settingLabel}>Debug Mode</div>
                        <div style={styles.settingDescription}>Enable verbose console logging.</div>
                    </div>
                    <SafeFormSwitch
                        checked={pluginSettings.debugMode}
                        onChange={(val: boolean) => updateSettings({ debugMode: val })}
                    />
                </div>

                {/* Sliders */}
                <div style={styles.settingCardSpan2}>
                    <Forms.FormTitle tag="h5" style={{ color: "#a1a1aa", marginBottom: 4, fontSize: 14 }}>Concurrent Runners</Forms.FormTitle>
                    <Forms.FormText style={{ color: "#a1a1aa", marginBottom: 16, fontSize: 12 }}>
                        Max concurrent quests. (Default: {pluginSettingsDefinition.concurrentLimit.default})
                    </Forms.FormText>
                    <SafeFormSlider
                        initialValue={pluginSettings.concurrentLimit}
                        minValue={1}
                        maxValue={3}
                        markers={[1, 2, 3]}
                        stickToMarkers
                        onValueChange={(val: number) => updateSettings({ concurrentLimit: Math.round(val) })}
                    />
                </div>

                <div style={styles.settingCardSpan2}>
                    <Forms.FormTitle tag="h5" style={{ color: "#a1a1aa", marginBottom: 4, fontSize: 14 }}>
                        Video Progress Speed (seconds)
                    </Forms.FormTitle>
                    <Forms.FormText style={{ color: "#a1a1aa", marginBottom: 16, fontSize: 12 }}>
                        Video progress increment per cycle. (Default: {pluginSettingsDefinition.videoProgressSpeed.default})
                    </Forms.FormText>
                    <SafeFormSlider
                        initialValue={pluginSettings.videoProgressSpeed}
                        minValue={1}
                        maxValue={15}
                        markers={[1, 3, 5, 7, 10, 15]}
                        onValueChange={(val: number) => updateSettings({ videoProgressSpeed: Math.round(val) })}
                    />
                </div>

                <div style={styles.settingCardSpan2}>
                    <Forms.FormTitle tag="h5" style={{ color: "#a1a1aa", marginBottom: 4, fontSize: 14 }}>
                        Max Future Offset (seconds)
                    </Forms.FormTitle>
                    <Forms.FormText style={{ color: "#a1a1aa", marginBottom: 16, fontSize: 12 }}>
                        Max future timestamp offset for video quests. (Default: {pluginSettingsDefinition.maxFutureOffset.default})
                    </Forms.FormText>
                    <SafeFormSlider
                        initialValue={pluginSettings.maxFutureOffset}
                        minValue={5}
                        maxValue={30}
                        markers={[5, 10, 15, 20, 25, 30]}
                        onValueChange={(val: number) => updateSettings({ maxFutureOffset: Math.round(val) })}
                    />
                </div>

                <div style={styles.settingCardSpan2}>
                    <Forms.FormTitle tag="h5" style={{ color: "#a1a1aa", marginBottom: 4, fontSize: 14 }}>
                        API Timeout (ms)
                    </Forms.FormTitle>
                    <Forms.FormText style={{ color: "#a1a1aa", marginBottom: 16, fontSize: 12 }}>
                        API request timeout. (Default: {pluginSettingsDefinition.apiTimeout.default})
                    </Forms.FormText>
                    <SafeFormSlider
                        initialValue={pluginSettings.apiTimeout}
                        minValue={3000}
                        maxValue={15000}
                        markers={[3000, 5000, 8000, 10000, 15000]}
                        onValueChange={(val: number) => updateSettings({ apiTimeout: Math.round(val) })}
                    />
                </div>

                {/* Text Input */}
                <div style={styles.settingCardSpan2}>
                    <Forms.FormTitle tag="h5" style={{ color: "#a1a1aa", marginBottom: 8, fontSize: 14 }}>
                        Excluded Quest IDs
                    </Forms.FormTitle>
                    <Forms.FormText style={{ color: "#a1a1aa", marginBottom: 12, fontSize: 12 }}>
                        Comma-separated list of quest IDs to exclude.
                    </Forms.FormText>
                    <SafeFormTextInput
                        placeholder="ID1, ID2, ID3..."
                        value={pluginSettings.excludedQuestIds}
                        onChange={(val: string) => updateSettings({ excludedQuestIds: val })}
                    />
                </div>
            </div>

            {/* Warning Banner */}
            <div style={styles.warning}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="#ffffff">
                    <path d="M9 1L17 15H1L9 1Z M9 6V10 M9 12V13" stroke="#ffffff" strokeWidth="2" fill="none" />
                </svg>
                <span>
                    This plugin automates Discord quest completion and may violate Discord's Terms of Service.
                    Use at your own risk.
                </span>
            </div>

            {/* Footer Info */}
            <div style={styles.footer}>
                <div style={styles.footerItem}>
                    <span style={styles.footerLabel}>API Status:</span>
                    <span style={styles.footerValue(state.getApi() !== null)}>
                        {state.getApi() ? "Connected" : "Disconnected"}
                    </span>
                </div>
                <div style={styles.footerItem}>
                    <span style={styles.footerLabel}>Store:</span>
                    <span style={styles.footerValue(state.getQuestStore() !== null)}>
                        {state.getQuestStore() ? "Initialized" : "Not Initialized"}
                    </span>
                </div>
                {Date.now() < state.rateLimitUntil && (
                    <div style={styles.footerItem}>
                        <span style={styles.footerLabel}>Rate Limited:</span>
                        <span style={{ ...styles.footerValue(false), color: "#ffa500" }}>
                            {Math.round((state.rateLimitUntil - Date.now()) / 1000)}s
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ========================
// PREMIUM STYLES
// ========================

const styles = {
    container: {
        width: "100%",
        margin: 0,
        background: "#1a1a1d",
        borderRadius: 0,
        padding: 20,
        boxShadow: "none",
        border: "none",
        boxSizing: "border-box",
        color: "#e4e4e7"
    } as React.CSSProperties,

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: "1px solid #3f3f46",
        flexWrap: "wrap",
        gap: 12
    } as React.CSSProperties,

    headerContent: {
        display: "flex",
        alignItems: "center",
        gap: 16
    },

    logo: {
        width: 48,
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },

    title: {
        fontSize: 24,
        fontWeight: 700,
        color: "#ffffff",
        margin: 0,
        marginBottom: 4
    } as React.CSSProperties,

    subtitle: {
        fontSize: 13,
        color: "#a1a1aa",
        margin: 0
    },

    statusBadge: (_status: QuestStatus): React.CSSProperties => {
        return {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 20,
            background: "#27272a",
            border: "1px solid #3f3f46",
            fontSize: 12,
            fontWeight: 600,
            color: "#e4e4e7",
            textTransform: "capitalize"
        } as React.CSSProperties;
    },

    statusDot: (status: QuestStatus): React.CSSProperties => {
        const colors: Record<QuestStatus, string> = {
            [QuestStatus.IDLE]: "#71717a",
            [QuestStatus.RUNNING]: "#22c55e",
            [QuestStatus.COMPLETED]: "#22c55e",
            [QuestStatus.FAILED]: "#ef4444",
            [QuestStatus.RATE_LIMITED]: "#f59e0b"
        };

        return {
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: colors[status],
            boxShadow: `0 0 8px ${colors[status]}`,
            animation: status === QuestStatus.RUNNING ? "pulse 2s infinite" : "none"
        };
    },

    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 16,
        marginBottom: 24,
        width: "100%"
    } as React.CSSProperties,

    statCard: {
        background: "#27272a",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: "1px solid #3f3f46",
        transition: "all 0.3s ease",
        cursor: "default"
    } as React.CSSProperties,

    statIcon: (color: string): React.CSSProperties => ({
        width: 40,
        height: 40,
        borderRadius: 10,
        background: "#18181b",
        border: "1px solid #3f3f46",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color
    }),

    statValue: {
        fontSize: 24,
        fontWeight: 700,
        color: "#ffffff",
        lineHeight: 1
    },

    statLabel: {
        fontSize: 11,
        color: "#a1a1aa",
        marginTop: 4,
        textTransform: "uppercase",
        letterSpacing: "0.5px"
    } as React.CSSProperties,

    progressCard: {
        background: "#27272a",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        border: "1px solid #3f3f46"
    },

    progressHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16
    },

    progressTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: "#ffffff",
        marginBottom: 4
    },

    progressSubtitle: {
        fontSize: 12,
        color: "#a1a1aa",
        textTransform: "capitalize"
    } as React.CSSProperties,

    progressStats: {
        display: "flex",
        alignItems: "baseline",
        gap: 4
    },

    progressValue: {
        fontSize: 20,
        fontWeight: 700,
        color: "#818cf8"
    },

    progressSeparator: {
        fontSize: 14,
        color: "#a1a1aa"
    },

    progressTarget: {
        fontSize: 14,
        fontWeight: 600,
        color: "#a1a1aa"
    },

    progressBarContainer: {
        display: "flex",
        alignItems: "center",
        gap: 12
    },

    progressBarBg: {
        flex: 1,
        height: 8,
        background: "#18181b",
        borderRadius: 4,
        overflow: "hidden"
    },

    progressBarFill: {
        height: "100%",
        background: "#818cf8",
        borderRadius: 4,
        transition: "width 0.3s ease"
    } as React.CSSProperties,

    progressPercent: {
        fontSize: 14,
        fontWeight: 600,
        color: "#818cf8",
        minWidth: 45,
        textAlign: "right"
    } as React.CSSProperties,

    actions: {
        display: "flex",
        gap: 12,
        marginBottom: 24
    },

    primaryButton: {
        flex: 2,
        background: "#6366f1",
        border: "none",
        fontWeight: 600,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
    } as React.CSSProperties,

    secondaryButton: {
        flex: 1,
        background: "#27272a",
        border: "1px solid #3f3f46",
        color: "#e4e4e7",
        fontWeight: 600
    } as React.CSSProperties,

    settingsHeader: {
        display: "flex",
        alignItems: "center",
        color: "#ffffff",
        fontSize: 20,
        fontWeight: 600,
        margin: "16px 0 16px 0",
        paddingBottom: 16,
        borderBottom: "1px solid #3f3f46"
    },

    settingsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 16,
        marginBottom: 24,
        width: "100%"
    } as React.CSSProperties,

    settingCard: {
        background: "#27272a",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid #3f3f46"
    },

    settingCardSpan2: {
        background: "#27272a",
        borderRadius: 12,
        padding: "16px 20px",
        border: "1px solid #3f3f46",
        gridColumn: "1 / -1"
    },

    settingText: {
        display: "flex",
        flexDirection: "column",
        marginRight: 16
    } as React.CSSProperties,

    settingLabel: {
        fontSize: 15,
        fontWeight: 600,
        color: "#ffffff",
        marginBottom: 2
    },

    settingDescription: {
        fontSize: 12,
        color: "#a1a1aa"
    },

    spinner: {
        width: 14,
        height: 14,
        border: "2px solid #3f3f46",
        borderTopColor: "#ffffff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
    } as React.CSSProperties,

    warning: {
        background: "rgba(245, 158, 11, 0.15)",
        border: "1px solid #f59e0b",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 12,
        color: "#fbbf24",
        marginBottom: 16
    },

    footer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 16,
        borderTop: "1px solid #3f3f46",
        fontSize: 12
    },

    footerItem: {
        display: "flex",
        alignItems: "center",
        gap: 6
    },

    footerLabel: {
        color: "#a1a1aa"
    },

    footerValue: (isActive: boolean): React.CSSProperties => ({
        color: isActive ? "#22c55e" : "#ef4444",
        fontWeight: 600
    })
};

// ========================
// PLUGIN DEFINITION
// ========================

const CSS_INJECT_ID = "quest-spoofer-styles";

export default definePlugin({
    name: "QuestSpoofer",
    description: "Advanced quest automation with premium UI and safety features",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    settings,
    settingsAboutComponent: ControlPanel,

    async start() {
        Logger.action("QuestSpoofer Premium initializing...");

        // Inject CSS Animations
        if (typeof document !== "undefined" && !document.getElementById(CSS_INJECT_ID)) {
            const styleSheet = document.createElement("style");
            styleSheet.id = CSS_INJECT_ID;
            styleSheet.textContent = `
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(styleSheet);
        }

        state.getApi();
        state.setupMemoryCleanup();

        if (!(await state.initializeQuestStore())) {
            Logger.error("Failed to initialize - QuestsStore unavailable");
            showNotification("Initialization Failed", "QuestsStore could not be loaded");
            return;
        }

        FluxDispatcher.subscribe("LOGOUT", () => state.cleanup());
        FluxDispatcher.subscribe("LOGIN_FAILURE", () => state.cleanup());

        Logger.success("QuestSpoofer Premium initialized successfully");

        if (settings.store.autoSpoof) {
            setTimeout(() => {
                Logger.action("Auto-start enabled - beginning quest automation");
                void autoSpoof();
            }, 5000);
        } else {
            Logger.info("Auto-start disabled - use control panel to begin");
        }
    },

    stop() {
        // Remove injected styles on stop
        if (typeof document !== "undefined") {
            document.getElementById(CSS_INJECT_ID)?.remove();
        }

        state.cleanup();
        FluxDispatcher.unsubscribe("LOGOUT", state.cleanup);
        FluxDispatcher.unsubscribe("LOGIN_FAILURE", state.cleanup);
        Logger.action("QuestSpoofer Premium stopped");
    }
});
