/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, GuildChannelStore, Popout, RestAPI, RunningGameStore, useEffect, useRef, useState } from "@webpack/common";
import type { PropsWithChildren } from "react";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

const QuestsStore = findByPropsLazy("getQuest", "quests");
const ApplicationStreamingStore = findByPropsLazy("getStreamerActiveStreamMetadata");

const SUPPORTED_TASKS = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];

const globalProgress: QuestProgress = {};
const progressListeners = new Set<() => void>();

function setGlobalProgress(questId: string, update: Partial<QuestProgressEntry>) {
    globalProgress[questId] = { ...globalProgress[questId], ...update } as QuestProgressEntry;
    progressListeners.forEach(fn => fn());
}

function useGlobalProgress(): QuestProgress {
    const [, forceUpdate] = useState(0);
    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        progressListeners.add(listener);
        return () => { progressListeners.delete(listener); };
    }, []);
    return { ...globalProgress };
}

interface CancelToken {
    cancelled: boolean;
    cleanup?: () => void;
}

const cancelTokens = new Map<string, CancelToken>();

function cancelQuest(questId: string) {
    const token = cancelTokens.get(questId);
    if (token) {
        token.cancelled = true;
        token.cleanup?.();
        cancelTokens.delete(questId);
    }
}

interface QuestProgressEntry {
    status: "idle" | "running" | "done" | "error" | "paused";
    progress: number;
    total: number;
    message: string;
}

interface QuestProgress {
    [questId: string]: QuestProgressEntry;
}

function getQuests() {
    try {
        const quests = [...QuestsStore.quests.values()];
        return quests.filter((x: any) =>
            x.userStatus?.enrolledAt &&
            !x.userStatus?.completedAt &&
            new Date(x.config.expiresAt).getTime() > Date.now() &&
            SUPPORTED_TASKS.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y))
        );
    } catch {
        return [];
    }
}

function getTaskName(quest: any): string {
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    return SUPPORTED_TASKS.find(x => taskConfig.tasks[x] != null) ?? "UNKNOWN";
}

function getTaskLabel(taskName: string): string {
    switch (taskName) {
        case "WATCH_VIDEO":
        case "WATCH_VIDEO_ON_MOBILE":
            return "Watch Video";
        case "PLAY_ON_DESKTOP": return "Play Game";
        case "STREAM_ON_DESKTOP": return "Stream";
        case "PLAY_ACTIVITY": return "Play Activity";
        default: return taskName;
    }
}

function formatTime(seconds: number): string {
    const mins = Math.ceil(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
}

function getExpiryText(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
}

function getQuestImageUrl(quest: any): string | null {
    const { application, assets } = quest.config;
    if (assets?.hero) {
        return `https://cdn.discordapp.com/${assets.hero}?format=webp&width=128&height=128`;
    }
    if (assets?.questBarHero) {
        return `https://cdn.discordapp.com/${assets.questBarHero}?format=webp&width=128&height=128`;
    }
    if (application?.icon) {
        return `https://cdn.discordapp.com/app-icons/${application.id}/${application.icon}.webp?size=64`;
    }
    return null;
}

type UpdateFn = (questId: string, update: Partial<QuestProgressEntry>) => void;

async function completeQuest(quest: any, updateProgress: UpdateFn) {
    const questId = quest.id;
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const taskName = getTaskName(quest);
    const secondsNeeded = taskConfig.tasks[taskName].target;
    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
    const applicationId = quest.config.application.id;
    const applicationName = quest.config.application.name;
    const pid = Math.floor(Math.random() * 30000) + 1000;

    const token: CancelToken = { cancelled: false };
    cancelTokens.set(questId, token);

    updateProgress(questId, { status: "running", progress: secondsDone, total: secondsNeeded, message: "Starting..." });

    try {
        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const maxFuture = 10, speed = 7, interval = 1;
            const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
            let completed = false;

            while (true) {
                if (token.cancelled) {
                    updateProgress(questId, { status: "paused", message: "Paused" });
                    return;
                }
                const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                const diff = maxAllowed - secondsDone;
                const timestamp = secondsDone + speed;
                if (diff >= speed) {
                    const res = await RestAPI.post({
                        url: `/quests/${questId}/video-progress`,
                        body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) }
                    });
                    completed = res.body.completed_at != null;
                    secondsDone = Math.min(secondsNeeded, timestamp);
                    updateProgress(questId, { progress: secondsDone, message: `Watching video... ${formatTime(secondsNeeded - secondsDone)}` });
                }
                if (timestamp >= secondsNeeded) break;
                await new Promise(resolve => setTimeout(resolve, interval * 1000));
            }
            if (!completed) {
                await RestAPI.post({ url: `/quests/${questId}/video-progress`, body: { timestamp: secondsNeeded } });
            }
            updateProgress(questId, { status: "done", progress: secondsNeeded, message: "Completed!" });

        } else if (taskName === "PLAY_ON_DESKTOP") {
            if (typeof DiscordNative === "undefined") {
                updateProgress(questId, { status: "error", message: "Requires desktop app" });
                return;
            }
            const res = await RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` });
            const appData = res.body[0];
            const exeName = appData.executables?.find((x: any) => x.os === "win32")?.name?.replace(">", "") ?? appData.name.replace(/[/\\:*?"<>|]/g, "");

            const fakeGame = {
                cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                exeName,
                exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                hidden: false,
                isLauncher: false,
                id: applicationId,
                name: appData.name,
                pid,
                pidPath: [pid],
                processName: appData.name,
                start: Date.now(),
                distributor: null,
                lastFocused: Date.now(),
                lastLaunched: Date.now(),
                nativeProcessObserverId: 0,
            } as any;

            const realGames = RunningGameStore.getRunningGames();
            const fakeGames = [fakeGame] as any;
            const realGetRunningGames = RunningGameStore.getRunningGames;
            const realGetGameForPID = RunningGameStore.getGameForPID;
            RunningGameStore.getRunningGames = () => fakeGames;
            RunningGameStore.getGameForPID = (p: number) => fakeGames.find((x: any) => x.pid === p) ?? null;
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames } as any);

            updateProgress(questId, { message: `Spoofing ${applicationName}... ${formatTime(secondsNeeded - secondsDone)}` });

            const restoreGames = () => {
                RunningGameStore.getRunningGames = realGetRunningGames;
                RunningGameStore.getGameForPID = realGetGameForPID;
                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] } as any);
            };

            await new Promise<void>((resolve, reject) => {
                const fn = (data: any) => {
                    const progress = quest.config.configVersion === 1
                        ? data.userStatus.streamProgressSeconds
                        : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                    updateProgress(questId, { progress, message: `Playing ${applicationName}... ${formatTime(secondsNeeded - progress)}` });

                    if (progress >= secondsNeeded) {
                        restoreGames();
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        resolve();
                    }
                };
                token.cleanup = () => {
                    restoreGames();
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    reject(new Error("paused"));
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            });
            updateProgress(questId, { status: "done", progress: secondsNeeded, message: "Completed!" });

        } else if (taskName === "STREAM_ON_DESKTOP") {
            if (typeof DiscordNative === "undefined") {
                updateProgress(questId, { status: "error", message: "Requires desktop app" });
                return;
            }
            const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                id: applicationId,
                pid,
                sourceName: null
            });

            updateProgress(questId, { message: `Stream spoofed to ${applicationName}. Stream any window in VC!` });

            const restoreStream = () => {
                ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
            };

            await new Promise<void>((resolve, reject) => {
                const fn = (data: any) => {
                    const progress = quest.config.configVersion === 1
                        ? data.userStatus.streamProgressSeconds
                        : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                    updateProgress(questId, { progress, message: `Streaming... ${formatTime(secondsNeeded - progress)}` });

                    if (progress >= secondsNeeded) {
                        restoreStream();
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        resolve();
                    }
                };
                token.cleanup = () => {
                    restoreStream();
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    reject(new Error("paused"));
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            });
            updateProgress(questId, { status: "done", progress: secondsNeeded, message: "Completed!" });

        } else if (taskName === "PLAY_ACTIVITY") {
            const channels = ChannelStore.getSortedPrivateChannels?.() ?? [];
            let channelId = channels[0]?.id;
            if (!channelId) {
                const guilds = Object.values(GuildChannelStore.getAllGuilds()).find((x: any) => x != null && x.VOCAL?.length > 0) as any;
                channelId = guilds?.VOCAL?.[0]?.channel?.id;
            }
            if (!channelId) {
                updateProgress(questId, { status: "error", message: "No channel found" });
                return;
            }
            const streamKey = `call:${channelId}:1`;

            while (true) {
                if (token.cancelled) {
                    updateProgress(questId, { status: "paused", message: "Paused" });
                    return;
                }
                const heartbeatRes = await RestAPI.post({
                    url: `/quests/${questId}/heartbeat`,
                    body: { stream_key: streamKey, terminal: false }
                });
                const progress = heartbeatRes.body.progress.PLAY_ACTIVITY.value;
                updateProgress(questId, { progress, message: `Activity... ${formatTime(secondsNeeded - progress)}` });

                if (progress >= secondsNeeded) {
                    await RestAPI.post({
                        url: `/quests/${questId}/heartbeat`,
                        body: { stream_key: streamKey, terminal: true }
                    });
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 20 * 1000));
            }
            updateProgress(questId, { status: "done", progress: secondsNeeded, message: "Completed!" });
        }
    } catch (e: any) {
        if (e?.message === "paused") {
            updateProgress(questId, { status: "paused", message: "Paused" });
        } else {
            updateProgress(questId, { status: "error", message: e?.message ?? "Error" });
        }
    } finally {
        cancelTokens.delete(questId);
    }
}

const QUEST_ICON_PATH = "M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z";

function QuestIcon({ className }: { className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" className={className ?? "vc-quest-header-icon"}>
            <path fill="currentColor" d={QUEST_ICON_PATH} />
        </svg>
    );
}

function QuestCard({ quest, progressData, onComplete, onPause }: {
    quest: any;
    progressData?: QuestProgressEntry;
    onComplete: () => void;
    onPause: () => void;
}) {
    const taskName = getTaskName(quest);
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const secondsNeeded = taskConfig.tasks[taskName].target;
    const secondsDone = progressData?.progress ?? quest.userStatus?.progress?.[taskName]?.value ?? 0;
    const pct = Math.min(100, (secondsDone / secondsNeeded) * 100);
    const status = progressData?.status ?? "idle";
    const imageUrl = getQuestImageUrl(quest);

    return (
        <div className="vc-quest-card">
            <div className="vc-quest-card-hero">
                {imageUrl && <img className="vc-quest-card-hero-img" src={imageUrl} alt="" />}
                <div className="vc-quest-card-hero-overlay" />
                <div className="vc-quest-card-hero-info">
                    <div className="vc-quest-card-name">{quest.config.messages.questName}</div>
                    <div className="vc-quest-card-expires">{getExpiryText(quest.config.expiresAt)}</div>
                </div>
            </div>
            <div className="vc-quest-card-body">
                <div className="vc-quest-card-meta">
                    <div className="vc-quest-card-app">{quest.config.application.name}</div>
                    <div className="vc-quest-card-task">{getTaskLabel(taskName)}</div>
                </div>
                <div className="vc-quest-progress-wrap">
                    <div className="vc-quest-progress-bar">
                        <div className="vc-quest-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="vc-quest-progress-text">
                        <span>{formatTime(secondsDone)} / {formatTime(secondsNeeded)}</span>
                        <span className="vc-quest-progress-pct">{Math.round(pct)}%</span>
                    </div>
                </div>
                {status === "running" && (
                    <div className="vc-quest-status">
                        <div className="vc-quest-status-dot" />
                        <span className="vc-quest-status-text">{progressData?.message}</span>
                    </div>
                )}
                {status === "paused" && (
                    <div className="vc-quest-status-paused">
                        <span>PAUSED // click resume to continue</span>
                    </div>
                )}
                {status === "error" && (
                    <div className="vc-quest-status-error">
                        <span>{progressData?.message}</span>
                    </div>
                )}
                <button
                    className={`vc-quest-complete-btn ${status === "running" ? "vc-quest-running" : ""} ${status === "done" ? "vc-quest-done" : ""} ${status === "paused" ? "vc-quest-paused" : ""}`}
                    disabled={status === "done"}
                    onClick={status === "running" ? onPause : onComplete}
                >
                    {status === "idle" && ">> EXECUTE"}
                    {status === "running" && "|| PAUSE"}
                    {status === "done" && "// DONE"}
                    {status === "error" && ">> RETRY"}
                    {status === "paused" && "> RESUME"}
                </button>
            </div>
        </div>
    );
}

function QuestPopout() {
    const [quests, setQuests] = useState<any[]>([]);
    const progress = useGlobalProgress();

    useEffect(() => {
        setQuests(getQuests());
    }, []);

    return (
        <div className="vc-quest-popout">
            <div className="vc-quest-header">
                <QuestIcon />
                <span className="vc-quest-header-title">Quests</span>
                {quests.length > 0 && (
                    <span className="vc-quest-header-count">{quests.length}</span>
                )}
            </div>
            <div className="vc-quest-list">
                {quests.length === 0 ? (
                    <div className="vc-quest-empty">
                        <div className="vc-quest-empty-icon">
                            <QuestIcon />
                        </div>
                        <div className="vc-quest-empty-text">No Quests Available</div>
                        <div className="vc-quest-empty-sub">Check back later for new quests</div>
                    </div>
                ) : (
                    quests.map((quest: any) => (
                        <QuestCard
                            key={quest.id}
                            quest={quest}
                            progressData={progress[quest.id]}
                            onComplete={() => completeQuest(quest, setGlobalProgress)}
                            onPause={() => cancelQuest(quest.id)}
                        />
                    ))
                )}
            </div>
            <div className="vc-quest-footer">
                <a
                    className="vc-quest-footer-link"
                    href="https://www.kirakohler.es"
                    target="_blank"
                    rel="noreferrer"
                >
                    by Kira Kohler
                </a>
            </div>
        </div>
    );
}

function QuestPopoutButton() {
    const buttonRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <Popout
            position="bottom"
            align="right"
            animation={Popout.Animation.NONE}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            targetElementRef={buttonRef}
            renderPopout={() => <QuestPopout />}
        >
            {(_, { isShown }) => (
                <HeaderBarIcon
                    ref={buttonRef}
                    className="vc-quest-btn"
                    onClick={() => setShow(v => !v)}
                    tooltip={isShown ? null : "Quest Completer"}
                    icon={() => <QuestIcon className="vc-quest-icon" />}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

export default definePlugin({
    name: "QuestCompleter",
    description: "Adds a toolbar button to view and auto-complete Discord Quests",
    authors: [{ name: "kira_kohler", id: 839217437383983184n }],

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=trailing:.{0,50})\i\.Fragment,(?=\{children:\[)/,
                replace: "$self.TrailingWrapper,"
            }
        }
    ],

    TrailingWrapper({ children }: PropsWithChildren) {
        return (
            <>
                {children}
                <ErrorBoundary key="vc-quest-completer" noop>
                    <QuestPopoutButton />
                </ErrorBoundary>
            </>
        );
    },
});
