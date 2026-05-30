import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
import {
    ApplicationStreamingStore,
    ChannelStore,
    FluxDispatcher,
    GuildChannelStore,
    RestAPI,
    RunningGameStore
} from "@webpack/common";

const questsStore = findStoreLazy("QuestsStore") as any;

const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"] as const;

const settings = definePluginSettings({
    watchVideo: {
        type: OptionType.BOOLEAN,
        description: "Solve WATCH_VIDEO quests by spoofing video progress",
        default: true,
    },
    playOnDesktop: {
        type: OptionType.BOOLEAN,
        description: "Solve PLAY_ON_DESKTOP quests by spoofing a running game",
        default: true,
    },
    streamOnDesktop: {
        type: OptionType.BOOLEAN,
        description: "Solve STREAM_ON_DESKTOP quests by spoofing a stream",
        default: true,
    },
    playActivity: {
        type: OptionType.BOOLEAN,
        description: "Solve PLAY_ACTIVITY quests by sending heartbeats",
        default: true,
    },
});

const cleanups: Array<() => void> = [];
const isApp = typeof DiscordNative !== "undefined";

function getActiveQuests(): any[] {
    try {
        const qs = questsStore?.quests;
        if (!qs || !(qs instanceof Map)) {
            console.log("[Quest Solver] QuestsStore not found or quests is not a Map", { qs, keys: qs ? Object.keys(qs) : null });
            // Fallback: try to find via findByProps
            const fallback = findByPropsLazy("quests", "getQuest") as any;
            const qs2 = fallback?.quests;
            if (qs2 instanceof Map) {
                return [...qs2.values()].filter((quest: any) =>
                    quest.userStatus?.enrolledAt &&
                    !quest.userStatus?.completedAt &&
                    new Date(quest.config.expiresAt).getTime() > Date.now() &&
                    supportedTasks.some(t => Object.keys((quest.config.taskConfig ?? quest.config.taskConfigV2).tasks).includes(t))
                );
            }
            return [];
        }
        return [...qs.values()].filter((quest: any) =>
            quest.userStatus?.enrolledAt &&
            !quest.userStatus?.completedAt &&
            new Date(quest.config.expiresAt).getTime() > Date.now() &&
            supportedTasks.some(t => Object.keys((quest.config.taskConfig ?? quest.config.taskConfigV2).tasks).includes(t))
        );
    } catch (e) {
        console.error("[Quest Solver] Error getting quests:", e);
        return [];
    }
}

function getTaskName(quest: any): string | null {
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    for (const t of supportedTasks) {
        if (taskConfig.tasks[t]) return t;
    }
    return null;
}

function getSecondsNeeded(quest: any, taskName: string): number {
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    return taskConfig.tasks[taskName].target;
}

function getSecondsDone(quest: any, taskName: string): number {
    return quest.userStatus?.progress?.[taskName]?.value ?? 0;
}

function solveVideoQuest(quest: any): Promise<void> {
    return new Promise(resolve => {
        const speed = 7;
        const secondsNeeded = getSecondsNeeded(quest, "WATCH_VIDEO");
        let secondsDone = getSecondsDone(quest, "WATCH_VIDEO");
        let stopped = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        cleanups.push(() => {
            stopped = true;
            if (timer) clearTimeout(timer);
        });

        (async () => {
            while (!stopped) {
                const remaining = Math.min(speed, secondsNeeded - secondsDone);
                await new Promise(r => { timer = setTimeout(r, remaining * 1000); });
                if (stopped) break;

                const timestamp = secondsDone + speed;
                try {
                    const res = await RestAPI.post({
                        url: `/quests/${quest.id}/video-progress`,
                        body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) }
                    });
                    if (res.body.completed_at != null) {
                        console.log(`[Quest Solver] Completed ${quest.config.messages.questName}`);
                        break;
                    }
                } catch (e) {
                    console.error("[Quest Solver] video-progress error:", e);
                }
                secondsDone = Math.min(secondsNeeded, timestamp);
                if (timestamp >= secondsNeeded) break;
            }
            if (!stopped) {
                try {
                    await RestAPI.post({
                        url: `/quests/${quest.id}/video-progress`,
                        body: { timestamp: secondsNeeded }
                    });
                } catch (e) {
                    console.error("[Quest Solver] final video-progress error:", e);
                }
            }
            resolve();
        })();
    });
}

function solvePlayDesktopQuest(quest: any): Promise<void> {
    return new Promise(resolve => {
        if (!isApp) {
            console.log(`[Quest Solver] ${quest.config.messages.questName} requires desktop app. Skipping.`);
            resolve();
            return;
        }

        let stopped = false;
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const secondsNeeded = getSecondsNeeded(quest, "PLAY_ON_DESKTOP");

        RestAPI.get({ url: `/applications/public?application_ids=${quest.config.application.id}` })
            .then(res => {
                if (stopped) return;
                const appData = res.body[0];
                const exeName = appData.executables?.find((x: any) => x.os === "win32")?.name?.replace(">", "")
                    ?? appData.name.replace(/[\/\\:*?"<>|]/g, "");

                const fakeGame = {
                    cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                    exeName,
                    exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                    hidden: false,
                    isLauncher: false,
                    id: quest.config.application.id,
                    name: appData.name,
                    pid,
                    pidPath: [pid],
                    processName: appData.name,
                    start: Date.now(),
                    distributor: null,
                    lastFocused: Date.now(),
                    lastLaunched: Date.now(),
                    nativeProcessObserverId: null,
                } as any;

                const realGetRunningGames = RunningGameStore.getRunningGames;
                const realGetGameForPID = RunningGameStore.getGameForPID;
                RunningGameStore.getRunningGames = () => [fakeGame];
                RunningGameStore.getGameForPID = (p: number) => p === pid ? fakeGame : null;

                FluxDispatcher.dispatch({
                    type: "RUNNING_GAMES_CHANGE",
                    removed: [],
                    added: [fakeGame],
                    games: [fakeGame]
                });

                const handler = (data: any) => {
                    if (stopped) return;
                    const progress = quest.config.configVersion === 1
                        ? data.userStatus.streamProgressSeconds
                        : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                    console.log(`[Quest Solver] ${quest.config.messages.questName}: ${progress}/${secondsNeeded}`);

                    if (progress >= secondsNeeded) {
                        RunningGameStore.getRunningGames = realGetRunningGames;
                        RunningGameStore.getGameForPID = realGetGameForPID;
                        FluxDispatcher.dispatch({
                            type: "RUNNING_GAMES_CHANGE",
                            removed: [fakeGame],
                            added: [],
                            games: []
                        });
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);
                        console.log(`[Quest Solver] Completed ${quest.config.messages.questName}`);
                        resolve();
                    }
                };

                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);

                cleanups.push(() => {
                    stopped = true;
                    RunningGameStore.getRunningGames = realGetRunningGames;
                    RunningGameStore.getGameForPID = realGetGameForPID;
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);
                });

                console.log(`[Quest Solver] Spoofed game: ${appData.name}. Wait ~${Math.ceil((secondsNeeded - getSecondsDone(quest, "PLAY_ON_DESKTOP")) / 60)}min`);
            })
            .catch(e => {
                console.error("[Quest Solver] Failed to fetch app data:", e);
                resolve();
            });
    });
}

function solveStreamDesktopQuest(quest: any): Promise<void> {
    return new Promise(resolve => {
        if (!isApp) {
            console.log(`[Quest Solver] ${quest.config.messages.questName} requires desktop app. Skipping.`);
            resolve();
            return;
        }

        let stopped = false;
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const secondsNeeded = getSecondsNeeded(quest, "STREAM_ON_DESKTOP");

        const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
        ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
            id: quest.config.application.id,
            pid,
            sourceName: null,
        });

        const handler = (data: any) => {
            if (stopped) return;
            const progress = quest.config.configVersion === 1
                ? data.userStatus.streamProgressSeconds
                : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
            console.log(`[Quest Solver] ${quest.config.messages.questName}: ${progress}/${secondsNeeded}`);

            if (progress >= secondsNeeded) {
                ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);
                console.log(`[Quest Solver] Completed ${quest.config.messages.questName}`);
                resolve();
            }
        };

        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);

        cleanups.push(() => {
            stopped = true;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);
        });

        console.log(`[Quest Solver] Spoofed stream for ${quest.config.application.name}. Stream any window in VC. Need 1+ other person in VC.`);
    });
}

function solvePlayActivityQuest(quest: any): Promise<void> {
    return new Promise(resolve => {
        let stopped = false;
        const secondsNeeded = getSecondsNeeded(quest, "PLAY_ACTIVITY");
        let timer: ReturnType<typeof setTimeout> | null = null;

        cleanups.push(() => {
            stopped = true;
            if (timer) clearTimeout(timer);
        });

        // Get a voice channel for the stream key
        const dmChannel = (ChannelStore as any).getSortedPrivateChannels?.()?.[0];
        const guildChannels = (GuildChannelStore as any).getAllGuilds?.();
        let channelId = dmChannel?.id;
        if (!channelId && guildChannels) {
            const vocal = Object.values(guildChannels).find((g: any) => g?.VOCAL?.length > 0) as any;
            channelId = vocal?.VOCAL?.[0]?.channel?.id;
        }
        if (!channelId) {
            console.log("[Quest Solver] No voice channel found for PLAY_ACTIVITY quest");
            resolve();
            return;
        }

        const streamKey = `call:${channelId}:1`;

        (async () => {
            while (!stopped) {
                try {
                    const res = await RestAPI.post({
                        url: `/quests/${quest.id}/heartbeat`,
                        body: { stream_key: streamKey, terminal: false }
                    });
                    const progress = res.body.progress.PLAY_ACTIVITY.value;
                    console.log(`[Quest Solver] ${quest.config.messages.questName}: ${progress}/${secondsNeeded}`);

                    if (progress >= secondsNeeded) {
                        await RestAPI.post({
                            url: `/quests/${quest.id}/heartbeat`,
                            body: { stream_key: streamKey, terminal: true }
                        });
                        break;
                    }
                } catch (e) {
                    console.error("[Quest Solver] heartbeat error:", e);
                }
                await new Promise(r => { timer = setTimeout(r, 20000); });
            }
            if (!stopped) {
                console.log(`[Quest Solver] Completed ${quest.config.messages.questName}`);
            }
            resolve();
        })();
    });
}

export default definePlugin({
    name: "Quest Solver",
    description: "Automatically solve Discord quests (Watch, Play, Stream, Activity)",
    authors: [],
    settings,

    start() {
        console.log("[Quest Solver] Starting...");
        console.log("[Quest Solver] QuestsStore available:", !!questsStore);
        console.log("[Quest Solver] QuestsStore keys:", questsStore ? Object.keys(questsStore) : []);
        if (questsStore?.quests) {
            console.log("[Quest Solver] quests is Map:", questsStore.quests instanceof Map);
            console.log("[Quest Solver] quests size:", questsStore.quests instanceof Map ? questsStore.quests.size : "N/A");
        }

        const quests = getActiveQuests();
        if (!quests.length) {
            console.log("[Quest Solver] No active uncompleted quests found.");
            return;
        }
        console.log(`[Quest Solver] Found ${quests.length} quest(s). Starting...`);

        (async () => {
            for (const quest of quests) {
                const taskName = getTaskName(quest);
                if (!taskName) continue;

                const settingMap: Record<string, boolean> = {
                    WATCH_VIDEO: settings.store.watchVideo,
                    WATCH_VIDEO_ON_MOBILE: settings.store.watchVideo,
                    PLAY_ON_DESKTOP: settings.store.playOnDesktop,
                    STREAM_ON_DESKTOP: settings.store.streamOnDesktop,
                    PLAY_ACTIVITY: settings.store.playActivity,
                };

                if (!settingMap[taskName]) {
                    console.log(`[Quest Solver] Skipping ${quest.config.messages.questName} (${taskName} disabled in settings)`);
                    continue;
                }

                console.log(`[Quest Solver] Solving: ${quest.config.messages.questName} (${taskName})`);

                try {
                    switch (taskName) {
                        case "WATCH_VIDEO":
                        case "WATCH_VIDEO_ON_MOBILE":
                            await solveVideoQuest(quest);
                            break;
                        case "PLAY_ON_DESKTOP":
                            await solvePlayDesktopQuest(quest);
                            break;
                        case "STREAM_ON_DESKTOP":
                            await solveStreamDesktopQuest(quest);
                            break;
                        case "PLAY_ACTIVITY":
                            await solvePlayActivityQuest(quest);
                            break;
                    }
                } catch (e) {
                    console.error(`[Quest Solver] Failed on ${quest.config.messages.questName}:`, e);
                }
            }
            console.log("[Quest Solver] All quests processed.");
        })();
    },

    stop() {
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
        console.log("[Quest Solver] Stopped and cleaned up.");
    },
});
