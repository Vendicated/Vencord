/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, GuildChannelStore, RestAPI, showToast, React } from "@webpack/common";

type AnyObj = Record<string, any>;

const RunningGameStore = findByPropsLazy("getRunningGames", "getGameForPID");
const ApplicationStreamingStore = findByPropsLazy("getStreamerActiveStreamMetadata");
const QuestsStore = findByPropsLazy("quests", "getQuest");

// ---------------------- Settings ----------------------
const settings = definePluginSettings({
    autoComplete: {
        type: OptionType.BOOLEAN,
        description: "Auto-complete quests automatically",
        default: false,
        onChange: () => restartAuto()
    },
    showToasts: {
        type: OptionType.BOOLEAN,
        description: "Show toast notifications for progress and results",
        default: true
    },
    addCallBarButton: {
        type: OptionType.BOOLEAN,
        description: "Shows a special button in the call control bar to complete quests manually (Only shows status if auto-complete is enabled)",
        default: true
    }
});

// ------- Progress Toast Helpers -------
const progressToastAt: Record<string, number> = Object.create(null);
function maybeProgressToast(key: string, label: string, current: number, total: number, minGapMs = 60_000) {
    if (!settings.store.showToasts) return;
    const now = Date.now();
    const last = progressToastAt[key] ?? 0;
    const pct = Math.min(100, Math.floor((current / Math.max(1, total)) * 100));
    if (now - last >= minGapMs) {
        showToast(`${label}: ${pct}%`, "message");
        progressToastAt[key] = now;
    }
}
function clearProgressKey(key: string) {
    delete progressToastAt[key];
}

function isDesktop() {
    try {
        const g = globalThis as AnyObj;
        return typeof g.IS_DISCORD_DESKTOP !== "undefined" ? Boolean(g.IS_DISCORD_DESKTOP) : typeof g.DiscordNative !== "undefined";
    } catch {
        return typeof (globalThis as AnyObj).DiscordNative !== "undefined";
    }
}

function pickQuest(): any | null {
    try {
        const store: AnyObj = QuestsStore as unknown as AnyObj;
        const list: any[] = store?.quests ? Array.from(store.quests.values()) : [];
        const now = Date.now();
        return list.find(q => q?.id !== "1248385850622869556" && q?.userStatus?.enrolledAt && !q?.userStatus?.completedAt && new Date(q?.config?.expiresAt).getTime() > now) ?? null;
    } catch {
        return null;
    }
}

function getTaskInfo(quest: any) {
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const taskName = [
        "WATCH_VIDEO",
        "PLAY_ON_DESKTOP",
        "STREAM_ON_DESKTOP",
        "PLAY_ACTIVITY",
        "WATCH_VIDEO_ON_MOBILE"
    ].find(k => taskConfig?.tasks?.[k] != null);
    if (!taskName) return null;
    const secondsNeeded = taskConfig.tasks[taskName].target as number;
    const secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
    return { taskName, secondsNeeded, secondsDone };
}

function findAnyVoiceChannelId(): string | undefined {
    const dmId = ChannelStore.getSortedPrivateChannels?.()[0]?.id as string | undefined;
    if (dmId) return dmId;
    try {
        const guildsObj = (GuildChannelStore as AnyObj).getAllGuilds?.();
        const guildList = Object.values(guildsObj ?? {}) as AnyObj[];
        const firstVoc = guildList.find((g: AnyObj) => g && Array.isArray(g.VOCAL) && g.VOCAL.length > 0) as AnyObj | undefined;
        return firstVoc?.VOCAL?.[0]?.channel?.id;
    } catch { /* ignore */ }
    return undefined;
}

function getQuestProgressFromStore(questId: string, taskName: string): number {
    try {
        const store: AnyObj = QuestsStore as unknown as AnyObj;
        const q = store?.getQuest ? store.getQuest(questId) : (store?.quests?.get ? store.quests.get(questId) : null);
        if (!q) return 0;
        const v = q?.userStatus?.progress?.[taskName]?.value;
        if (typeof v === "number") return Math.floor(v);
        if (taskName === "PLAY_ON_DESKTOP" || taskName === "STREAM_ON_DESKTOP") {
            const s = q?.userStatus?.streamProgressSeconds;
            if (typeof s === "number") return Math.floor(s);
        }
        return 0;
    } catch {
        return 0;
    }
}

function waitForProgress(quest: any, taskName: string, secondsNeeded: number, timeoutMs = 15 * 60 * 1000, pollMs = 10 * 1000): Promise<void> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = async () => {
            try {
                const val = getQuestProgressFromStore(quest.id, taskName);
                if (val >= secondsNeeded) return resolve();
                if (Date.now() - start > timeoutMs) return reject(new Error("Timeout waiting for quest progress"));
            } catch {
                // ignore
            }
            timer = setTimeout(tick, pollMs) as unknown as number;
        };
        let timer = setTimeout(tick, pollMs) as unknown as number;
    });
}

async function completeWatchVideo(quest: any, secondsNeeded: number, secondsDoneInit: number) {
    const maxFuture = 10, speed = 7, interval = 1;
    const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
    let completed = false;
    let secondsDone = secondsDoneInit ?? 0;
    const questName = quest.config?.messages?.questName ?? "Quest";
    const toastKey = `video:${quest.id}`;

    while (true) {
        const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
        const diff = maxAllowed - secondsDone;
        const timestamp = secondsDone + speed;
        if (diff >= speed) {
            const res: AnyObj = await (RestAPI as AnyObj).post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
            completed = res?.body?.completed_at != null;
            secondsDone = Math.min(secondsNeeded, timestamp);
            maybeProgressToast(toastKey, `Progress ${questName}`, secondsDone, secondsNeeded, 15_000);
        }

        if (timestamp >= secondsNeeded) break;
        await new Promise(r => setTimeout(r, interval * 1000));
    }
    if (!completed) {
        await (RestAPI as AnyObj).post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
    }
    clearProgressKey(toastKey);
}

async function completePlayOnDesktop(quest: any, secondsNeeded: number, secondsDone: number) {
    if (!isDesktop()) {
        showToast("This no longer works in browser for non-video quests. Please use the desktop app.", "failure");
        return;
    }

    const applicationId = quest.config.application.id;
    const res: AnyObj = await (RestAPI as AnyObj).get({ url: `/applications/public?application_ids=${applicationId}` });
    const appData = res?.body?.[0];
    if (!appData) {
        showToast("Could not fetch application data.", "failure");
        return;
    }

    const exeName = String(appData.executables.find((x: AnyObj) => x.os === "win32")?.name || appData.name).replace(">", "");
    const pid = Math.floor(Math.random() * 30000) + 1000;

    const fakeGame = {
        cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
        exeName,
        exePath: `c:/program files/${String(appData.name).toLowerCase()}/${exeName}`,
        hidden: false,
        isLauncher: false,
        id: applicationId,
        name: appData.name,
        pid,
        pidPath: [pid],
        processName: appData.name,
        start: Date.now(),
    };

    const realGetRunningGames = (RunningGameStore as AnyObj).getRunningGames;
    const realGetGameForPID = (RunningGameStore as AnyObj).getGameForPID;
    const realGames = realGetRunningGames?.() ?? [];
    const fakeGames = [fakeGame];

    (RunningGameStore as AnyObj).getRunningGames = () => fakeGames;
    (RunningGameStore as AnyObj).getGameForPID = (p: number) => fakeGames.find(x => x.pid === p);
    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames } as AnyObj);

    const questDoneByEvent = new Promise<void>((resolve) => {
        const handler = (data: AnyObj) => {
            const progress = quest.config.configVersion === 1 ? data?.userStatus?.streamProgressSeconds : Math.floor(data?.userStatus?.progress?.PLAY_ON_DESKTOP?.value ?? 0);
            if (progress >= secondsNeeded) {
                (RunningGameStore as AnyObj).getRunningGames = realGetRunningGames;
                (RunningGameStore as AnyObj).getGameForPID = realGetGameForPID;
                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] } as AnyObj);
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS" as any, handler as any);
                resolve();
            }
        };
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS" as any, handler as any);
    });

    const questDoneByPoll = waitForProgress(quest, "PLAY_ON_DESKTOP", secondsNeeded).catch(() => { /* ignore timeout here */ });

    const questDoneByHeartbeat = new Promise<void>(async (resolve, reject) => {
        try {
            const applicationIdHb = quest.config.application?.id;
            if (!applicationIdHb) return reject(new Error("Missing application_id for heartbeat"));
            const started = Date.now();
            while (true) {
                const body: AnyObj = { application_id: applicationIdHb, platform: "desktop", terminal: false };
                const res: AnyObj = await (RestAPI as AnyObj).post({ url: `/quests/${quest.id}/heartbeat`, body });
                const progress = Math.floor(res?.body?.progress?.PLAY_ON_DESKTOP?.value ?? 0);
                if (progress >= secondsNeeded) {
                    await (RestAPI as AnyObj).post({ url: `/quests/${quest.id}/heartbeat`, body: { ...body, terminal: true } });
                    return resolve();
                }
                if (Date.now() - started > 20 * 60 * 1000) return reject(new Error("PLAY_ON_DESKTOP heartbeat timeout"));
                await new Promise(r => setTimeout(r, 20_000));
            }
        } catch (e) { reject(e as any); }
    });

    const minutes = Math.max(0, Math.ceil((secondsNeeded - (secondsDone ?? 0)) / 60));
    if (settings.store.showToasts) showToast(`Spoofed your game to ${appData.name}. Wait ~${minutes} minute(s).`, "message");

    const questName = quest.config?.messages?.questName ?? "Quest";
    const tickerKey = `play_on_desktop:${quest.id}`;
    const ticker = settings.store.showToasts ? setInterval(() => {
        try {
            const cur = getQuestProgressFromStore(quest.id, "PLAY_ON_DESKTOP");
            maybeProgressToast(tickerKey, `Progress ${questName}`, cur, secondsNeeded, 60_000);
        } catch { /* ignore */ }
    }, 60_000) as unknown as number : undefined;

    try {
        await Promise.race([questDoneByEvent, questDoneByPoll, questDoneByHeartbeat]);
    } finally {
        (RunningGameStore as AnyObj).getRunningGames = realGetRunningGames;
        (RunningGameStore as AnyObj).getGameForPID = realGetGameForPID;
        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: realGames } as AnyObj);
        if (ticker) clearInterval(ticker as unknown as number);
        clearProgressKey(tickerKey);
    }
}

async function completeStreamOnDesktop(quest: any, secondsNeeded: number, secondsDone: number, applicationId: string) {
    if (!isDesktop()) {
        showToast("This no longer works in browser for non-video quests. Please use the desktop app.", "failure");
        return;
    }

    const pid = Math.floor(Math.random() * 30000) + 1000;
    const realFunc = (ApplicationStreamingStore as AnyObj).getStreamerActiveStreamMetadata;
    (ApplicationStreamingStore as AnyObj).getStreamerActiveStreamMetadata = () => ({ id: applicationId, pid, sourceName: null });

    const questDoneByEvent = new Promise<void>((resolve) => {
        const handler = (data: AnyObj) => {
            const progress = quest.config.configVersion === 1 ? data?.userStatus?.streamProgressSeconds : Math.floor(data?.userStatus?.progress?.STREAM_ON_DESKTOP?.value ?? 0);
            if (progress >= secondsNeeded) {
                (ApplicationStreamingStore as AnyObj).getStreamerActiveStreamMetadata = realFunc;
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS" as any, handler as any);
                resolve();
            }
        };
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS" as any, handler as any);
    });

    const questDoneByPoll = waitForProgress(quest, "STREAM_ON_DESKTOP", secondsNeeded).catch(() => { /* ignore timeout */ });

    const channelId = findAnyVoiceChannelId();
    const streamKey = channelId ? `call:${channelId}:1` : undefined;
    const questDoneByHeartbeat = streamKey ? new Promise<void>(async (resolve, reject) => {
        try {
            const started = Date.now();
            while (true) {
                const body: AnyObj = { stream_key: streamKey, application_id: applicationId, terminal: false };
                const res: AnyObj = await (RestAPI as AnyObj).post({ url: `/quests/${quest.id}/heartbeat`, body });
                const progress = Math.floor(res?.body?.progress?.STREAM_ON_DESKTOP?.value ?? 0);
                if (progress >= secondsNeeded) {
                    await (RestAPI as AnyObj).post({ url: `/quests/${quest.id}/heartbeat`, body: { ...body, terminal: true } });
                    return resolve();
                }
                if (Date.now() - started > 20 * 60 * 1000) return reject(new Error("STREAM_ON_DESKTOP heartbeat timeout"));
                await new Promise(r => setTimeout(r, 20_000));
            }
        } catch (e) { reject(e as any); }
    }) : Promise.reject(new Error("No channel for stream_key"));

    const minutes = Math.max(0, Math.ceil((secondsNeeded - (secondsDone ?? 0)) / 60));
    if (settings.store.showToasts) showToast(`Spoofed your stream. Stream any window for ~${minutes} minute(s). You need at least one other person in the VC.`, "message");

    const questName = quest.config?.messages?.questName ?? "Quest";
    const tickerKey = `stream_on_desktop:${quest.id}`;
    const ticker = settings.store.showToasts ? setInterval(() => {
        try {
            const cur = getQuestProgressFromStore(quest.id, "STREAM_ON_DESKTOP");
            maybeProgressToast(tickerKey, `Progress ${questName}`, cur, secondsNeeded, 60_000);
        } catch { /* ignore */ }
    }, 60_000) as unknown as number : undefined;

    try {
        await Promise.race([questDoneByEvent, questDoneByPoll, questDoneByHeartbeat]);
    } finally {
        (ApplicationStreamingStore as AnyObj).getStreamerActiveStreamMetadata = realFunc;
        if (ticker) clearInterval(ticker as unknown as number);
        clearProgressKey(tickerKey);
    }
}

async function completePlayActivity(quest: any, secondsNeeded: number) {
    const dmId = ChannelStore.getSortedPrivateChannels?.()[0]?.id as string | undefined;
    let channelId = dmId;
    if (!channelId) {
        try {
            const guildsObj = (GuildChannelStore as AnyObj).getAllGuilds?.();
            const guildList = Object.values(guildsObj ?? {}) as AnyObj[];
            const firstVoc = guildList.find((g: AnyObj) => g && Array.isArray(g.VOCAL) && g.VOCAL.length > 0) as AnyObj | undefined;
            channelId = firstVoc?.VOCAL?.[0]?.channel?.id;
        } catch { /* ignore */ }
    }
    if (!channelId) {
        showToast("Could not find any channel to play activity.", "failure");
        return;
    }

    const streamKey = `call:${channelId}:1`;

    let shownAt = 0;
    while (true) {
        const res: AnyObj = await (RestAPI as AnyObj).post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
        const progress = res?.body?.progress?.PLAY_ACTIVITY?.value ?? 0;
        if (progress >= secondsNeeded) {
            await (RestAPI as AnyObj).post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
            break;
        }

        if (settings.store.showToasts && Date.now() - shownAt > 60_000) {
            const questName = quest.config?.messages?.questName ?? "Quest";
            showToast(`Progress ${questName}: ${Math.floor((progress / Math.max(1, secondsNeeded)) * 100)}%`, "message");
            shownAt = Date.now();
        }
        await new Promise(r => setTimeout(r, 20 * 1000));
    }
}

async function runCompleteQuest(fromAuto = false) {
    try {
        if (isRunning) {
            if (!fromAuto) showStatusToast();
            return;
        }
        const quest = pickQuest();
        if (!quest) {
            if (!fromAuto && settings.store.showToasts) showToast("You don't have any uncompleted quests.", "message");
            return;
        }

        const { taskName, secondsNeeded, secondsDone } = getTaskInfo(quest) ?? {} as any;
        if (!taskName) {
            if (settings.store.showToasts) showToast("Couldn't determine quest task.", "failure");
            return;
        }

        const applicationId = quest.config.application?.id;
        const applicationName = quest.config.application?.name;
        const questName = quest.config.messages?.questName ?? "Quest";

        isRunning = true;
        currentQuestRun = { questId: quest.id, taskName, secondsNeeded, questName };
        lastStatusToastAt = 0;
        _emitUpdate();

        if (!fromAuto && settings.store.showToasts) showToast(`Starting: ${questName} (${taskName})`, "message");

        switch (taskName) {
            case "WATCH_VIDEO":
            case "WATCH_VIDEO_ON_MOBILE": {
                await completeWatchVideo(quest, secondsNeeded, secondsDone ?? 0);
                break;
            }
            case "PLAY_ON_DESKTOP": {
                if (!applicationId || !applicationName) {
                    if (settings.store.showToasts) showToast("Missing application info for PLAY_ON_DESKTOP.", "failure");
                    return;
                }
                await completePlayOnDesktop(quest, secondsNeeded, secondsDone ?? 0);
                break;
            }
            case "STREAM_ON_DESKTOP": {
                if (!applicationId) {
                    if (settings.store.showToasts) showToast("Missing application info for STREAM_ON_DESKTOP.", "failure");
                    return;
                }
                await completeStreamOnDesktop(quest, secondsNeeded, secondsDone ?? 0, applicationId);
                break;
            }
            case "PLAY_ACTIVITY": {
                await completePlayActivity(quest, secondsNeeded);
                break;
            }
            default:
                if (settings.store.showToasts) showToast(`Unsupported task: ${taskName}`, "failure");
                return;
        }

        if (settings.store.showToasts) {
            const questName = quest?.config?.messages?.questName ?? "Quest";
            showToast(`Completed: ${questName}`, "success");
        }
    } catch (e) {
        console.error("CompleteDiscordQuests error:", e);
        if (settings.store.showToasts) showToast("Error completing quest. Check console.", "failure");
    } finally {
        isRunning = false;
        currentQuestRun = null;
        lastCompletedAt = Date.now();
        _emitUpdate();
        setTimeout(() => _emitUpdate(), 3100);
    }
}

const CallBarButton = findComponentByCodeLazy(".NONE,disabled:", ".PANEL_BUTTON");

const gudBoi = true;

// ---- Single-run lock and status tracking ----
let isRunning = false;
let currentQuestRun: { questId: string; taskName: string; secondsNeeded: number; questName: string } | null = null;
let lastStatusToastAt = 0;
let lastCompletedAt = 0;
const _subscribers = new Set<() => void>();
function _emitUpdate() {
    _subscribers.forEach(cb => { try { cb(); } catch { /* ignore */ } });
}

function showStatusToast() {
    if (!settings.store.showToasts || !currentQuestRun) return;
    const now = Date.now();
    if (now - lastStatusToastAt < 5_000) return; // throttle
    lastStatusToastAt = now;
    try {
        const cur = getQuestProgressFromStore(currentQuestRun.questId, currentQuestRun.taskName);
        const pct = Math.min(100, Math.floor((cur / Math.max(1, currentQuestRun.secondsNeeded)) * 100));
        showToast(`In progress: ${currentQuestRun.questName} - ${pct}%`, "message");
    } catch {
        showToast(`In progress: ${currentQuestRun.questName}`, "message");
    }
}

// ----------------------

function DynamicQuestIcon() {
    const now = Date.now();
    if (isRunning) return React.createElement(RunningIcon as any);
    if (now - lastCompletedAt < 3000) return React.createElement(DoneIcon as any);
    return React.createElement(QuestIcon as any);
}

function QuestIcon() {
    return React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 24 24" },
        React.createElement("path", { fill: "currentColor", d: "M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z" })
    );
}

function RunningIcon() {
    return React.createElement(
        "svg",
        { xmlns: "http://www.w3.org/2000/svg", width: 20, height: 20, viewBox: "0 0 24 24" },
        React.createElement(
            "g",
            { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2 },
            React.createElement(
                "path",
                { strokeDasharray: "2 4", strokeDashoffset: 6 as any, d: "M12 21c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9" },
                React.createElement("animate", { attributeName: "stroke-dashoffset", dur: "0.6s", repeatCount: "indefinite", values: "6;0" })
            ),
            React.createElement(
                "path",
                { strokeDasharray: 32 as any, strokeDashoffset: 32 as any, d: "M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9" },
                React.createElement("animate", { fill: "freeze", attributeName: "stroke-dashoffset", begin: "0.1s", dur: "0.4s", values: "32;0" })
            ),
            React.createElement(
                "path",
                { strokeDasharray: 10 as any, strokeDashoffset: 10 as any, d: "M12 16v-7.5" },
                React.createElement("animate", { fill: "freeze", attributeName: "stroke-dashoffset", begin: "0.5s", dur: "0.2s", values: "10;0" })
            ),
            React.createElement(
                "path",
                { strokeDasharray: 6 as any, strokeDashoffset: 6 as any, d: "M12 8.5l3.5 3.5M12 8.5l-3.5 3.5" },
                React.createElement("animate", { fill: "freeze", attributeName: "stroke-dashoffset", begin: "0.7s", dur: "0.2s", values: "6;0" })
            )
        )
    );
}

function DoneIcon() {
    return React.createElement(
        "svg",
        { xmlns: "http://www.w3.org/2000/svg", width: 20, height: 20, viewBox: "0 0 24 24" },
        React.createElement("path", { fill: "currentColor", d: "M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5l234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z" })
    );
}

function CompleteQuestButton() {
    if (!settings.store.addCallBarButton) return null as unknown as any;
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    React.useEffect(() => {
        const cb = () => force(0);
        _subscribers.add(cb);
        return () => { _subscribers.delete(cb); };
    }, []);

    return React.createElement(CallBarButton as any, {
        tooltipText: isRunning ? "Quest in progress" : "Complete Discord Quest",
        icon: DynamicQuestIcon,
        role: "button",
        "aria-label": "Complete Discord Quest",
        onClick: () => {
            if (isRunning) {
                showStatusToast();
            } else {
                runCompleteQuest();
            }
        }
    });
}

// ----------------------

export default definePlugin({
    name: "CompleteDiscordQuests",
    description: "Automatically complete your Discord quests (Activities, Video, etc.). Developed and ported to Vencord by Aqualunem, based on amia's original script.",
    authors: [Devs.Aqualunem],
    dependencies: ["CommandsAPI"],

    start() {
        console.info("[CompleteDiscordQuests] start: plugin loaded");
        if (gudBoi.valueOf() === true) {
            console.info("Feddo is a gud boi");
        }
        startAuto();
    },
    stop() {
        console.info("[CompleteDiscordQuests] stop: plugin unloaded");
        stopAuto();
    },

    commands: [
        {
            name: "completeQuest",
            description: "Try to complete your active Discord quest",
            options: [],
            execute: runCompleteQuest
        }
    ],

    patches: [
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\i\.buttons,.{0,50}children:\[/,
                replace: "$&$self.CompleteQuestButton(),"
            }
        }
    ],

    CompleteQuestButton: ErrorBoundary.wrap(CompleteQuestButton, { noop: true }),
    settings,
});

let autoUnsubs: Array<() => void> = [];
let autoDebounceTimer: number | undefined;

function triggerAutoSoon(reason: string) {
    if (!settings.store.autoComplete) return;
    if (isRunning) return;
    if (autoDebounceTimer) clearTimeout(autoDebounceTimer as unknown as number);
    autoDebounceTimer = setTimeout(() => {
        try {
            if (settings.store.autoComplete && !isRunning) {
                runCompleteQuest(true);
            }
        } catch (e) {
            console.debug("[CompleteDiscordQuests] auto trigger error", reason, e);
        }
    }, 700) as unknown as number;
}

function startAuto() {
    stopAuto();

    const subscribe = (type: string) => {
        const handler = (_: any) => triggerAutoSoon(type);
        try {
            FluxDispatcher.subscribe(type as any, handler as any);
            autoUnsubs.push(() => {
                try { FluxDispatcher.unsubscribe(type as any, handler as any); } catch { /* ignore */ }
            });
        } catch { /* ignore */ }
    };

    //  Quest-related events to listen to | This may need to be updated if Discord changes their event names
    //  Or if new relevant events are added in the future... who knows with Discord :3
    [
        "QUESTS_FETCH_SUCCESS",
        "QUESTS_ENROLL_SUCCESS",
        "QUESTS_UPDATE",
        "QUESTS_USER_STATUS_UPDATE",
        "QUESTS_PROGRESS",
        "QUESTS_SEND_HEARTBEAT_SUCCESS"
    ].forEach(subscribe);

    try {
        const storeAny: AnyObj = QuestsStore as unknown as AnyObj;
        if (typeof storeAny.addChangeListener === "function") {
            const onChange = () => triggerAutoSoon("QuestsStore.change");
            storeAny.addChangeListener(onChange);
            autoUnsubs.push(() => { try { storeAny.removeChangeListener?.(onChange); } catch { /* ignore */ } });
        }
    } catch { /* ignore */ }

    if (settings.store.autoComplete) {
        setTimeout(() => triggerAutoSoon("startup"), 500);
    }
}

function stopAuto() {
    if (autoDebounceTimer) {
        clearTimeout(autoDebounceTimer as unknown as number);
        autoDebounceTimer = undefined as unknown as number;
    }
    for (const u of autoUnsubs.splice(0)) {
        try { u(); } catch { /* ignore */ }
    }
}

function restartAuto() {
    startAuto();
}

// ----------------------------------------------------------------------
// The code above is adapted from amia's original CompleteDiscordQuests script, but integrated as a Vencord plugin by me (Aqualunem).
// I also added some extra features, like the call bar button and improved error handling, and made sure it works well with Vencord's settings API.
//
// Please refer to the original Gist for the initial version and more details:
// https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb
//
// Code was completely rewritten to TypeScript, and adapted to Vencord's plugin system by me (Aqualunem).
// I am also developing the same plugin for other clients, like BetterDiscord and Powercord.
// ----------------------------------------------------------------------