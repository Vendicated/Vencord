/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { FluxDispatcher, RestAPI } from "@webpack/common";

const settings = definePluginSettings({
    autoStart: {
        type: OptionType.BOOLEAN,
        description: "Automatically start spoofing when entering the Quests page (not recommended)",
        default: false
    }
});

let isRunning = false;
let currentTimer: any = null;
let pollInterval: any = null;
let buttonElement: HTMLElement | null = null;
let originals: any = {};

const sleep = (ms: number) => new Promise<void>(resolve => {
    if (!isRunning) return resolve();
    currentTimer = setTimeout(() => {
        currentTimer = null;
        resolve();
    }, ms);
});

function updateStatus(text: string) {
    if (buttonElement) buttonElement.innerText = text;
    console.log(`[QuestMaster] ${text}`);
}

function getStores() {
    return {
        Streaming: findByProps("getStreamerActiveStreamMetadata"),
        Games: findByProps("getRunningGames"),
        Quests: findByProps("getQuest"),
        Channels: findByProps("getChannel", "hasChannel"),
        GuildChannels: findByProps("getSFWDefaultChannel"),
        Dispatcher: FluxDispatcher,
        User: findByProps("getCurrentUser")
    };
}

function restoreOriginals() {
    const Stores = getStores();

    if (originals.getRunningGames && Stores.Games) {
        Stores.Games.getRunningGames = originals.getRunningGames;
        Stores.Games.getGameForPID = originals.getGameForPID;
    }
    if (originals.getStreamerActiveStreamMetadata && Stores.Streaming) {
        Stores.Streaming.getStreamerActiveStreamMetadata = originals.getStreamerActiveStreamMetadata;
    }

    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: [], games: [] });
    originals = {};
    if (currentTimer) {
        clearTimeout(currentTimer);
        currentTimer = null;
    }
}

async function runQuestSpoofer() {
    if (isRunning) return;

    isRunning = true;
    updateStatus("Starting...");

    const Stores = getStores();

    if (!Stores.Games || !Stores.Quests || !Stores.Dispatcher) {
        console.error("[QuestMaster] Stores not found.");
        updateStatus("Error: Stores Missing");
        isRunning = false;
        return;
    }

    if (!originals.getRunningGames) {
        originals.getRunningGames = Stores.Games.getRunningGames;
        originals.getGameForPID = Stores.Games.getGameForPID;
        originals.getStreamerActiveStreamMetadata = Stores.Streaming?.getStreamerActiveStreamMetadata;
    }

    const supportedTasks = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "PLAY_ACTIVITY", "STREAM_ON_DESKTOP"];

    const getTaskName = (q: any) => {
        const config = q.config?.taskConfig ?? q.config?.taskConfigV2;
        return supportedTasks.find(x => config?.tasks?.[x] != null);
    };

    const getCategoryPriority = (q: any) => {
        const t = getTaskName(q);
        if (!t) return 0;
        if (t.includes("VIDEO")) return 3;
        if (t === "PLAY_ACTIVITY") return 2;
        if (t === "STREAM_ON_DESKTOP") return 0;
        return 1;
    };

    let quests: any[] = [];
    try {
        const questMap = Stores.Quests.quests;
        const allQuests = questMap?.values ? Array.from(questMap.values()) : Object.values(questMap ?? {});

        quests = allQuests.filter((x: any) =>
            x.userStatus?.enrolledAt &&
            !x.userStatus?.completedAt &&
            new Date(x.config?.expiresAt).getTime() > Date.now() &&
            getTaskName(x)
        ).sort((a: any, b: any) => {
            const prioA = getCategoryPriority(a);
            const prioB = getCategoryPriority(b);
            if (prioA !== prioB) return prioA - prioB;
            return new Date(b.config.expiresAt).getTime() - new Date(a.config.expiresAt).getTime();
        });
    } catch (e) {
        console.error("[QuestMaster] Error reading quests", e);
    }

    if (quests.length === 0) {
        updateStatus("No Quests Found");
        await sleep(2000);
        updateStatus("Spoof Quests");
        isRunning = false;
        return;
    }

    while (quests.length > 0) {
        if (!isRunning) break;

        const quest = quests.pop();
        const taskName = getTaskName(quest);
        if (!taskName) continue;

        const config = quest.config?.taskConfig ?? quest.config?.taskConfigV2;
        const target = config?.tasks?.[taskName]?.target ?? 0;
        const appId = quest.config?.application?.id;
        const appName = quest.config?.application?.name || "Unknown Game";
        const pid = Math.floor(Math.random() * 30000) + 1000;

        updateStatus(`Running: ${appName}`);

        try {
            if (taskName.includes("VIDEO")) {
                let cur = quest.userStatus?.progress?.[taskName]?.value ?? 0;
                while (cur < target && isRunning) {
                    cur = Math.min(target, cur + 7 + Math.random());
                    try {
                        const res = await RestAPI.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: cur } });
                        if (res.body?.completed_at) break;
                    } catch { }
                    await sleep(1500);
                }
            } else if (taskName === "PLAY_ACTIVITY") {
                const privateChans = Stores.Channels.getSortedPrivateChannels?.() ?? [];
                const guildChansRaw = Stores.GuildChannels?.getGuildChannels?.() ?? {};
                const guildChans = Array.isArray(guildChansRaw) ? guildChansRaw : Object.values(guildChansRaw);
                const voiceChan = guildChans.find((c: any) => c?.type === 2);

                const chanId = privateChans[0]?.id || voiceChan?.id;

                if (chanId) {
                    const streamKey = `call:${chanId}:1`;
                    await new Promise<void>(resolve => {
                        const checkProgress = async () => {
                            if (!isRunning) return resolve();
                            try {
                                const res = await RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                                const prog = res.body?.progress?.PLAY_ACTIVITY?.value ?? 0;
                                if (prog >= target) {
                                    await RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                                    resolve();
                                } else {
                                    currentTimer = setTimeout(checkProgress, 20000);
                                }
                            } catch {
                                resolve();
                            }
                        };
                        checkProgress();
                    });
                }
            } else {
                let exe = "game.exe";
                try {
                    const res = await RestAPI.get({ url: `/applications/public?application_ids=${appId}` });
                    const winExe = res.body?.[0]?.executables?.find((x: any) => x?.os === "win32");
                    if (winExe?.name) exe = winExe.name.replace(">", "");
                } catch { }

                const mock = {
                    cmdLine: `C:\\Program Files\\${appName}\\${exe}`,
                    exeName: exe,
                    exePath: `c:/program files/${appName.toLowerCase()}/${exe}`,
                    id: appId,
                    name: appName,
                    pid,
                    pidPath: [pid],
                    processName: appName,
                    start: Date.now() - 10000
                };

                Stores.Games.getRunningGames = () => [mock];
                Stores.Games.getGameForPID = (p: number) => p === pid ? mock : null;

                if (taskName === "STREAM_ON_DESKTOP" && Stores.Streaming) {
                    Stores.Streaming.getStreamerActiveStreamMetadata = () => ({ id: appId, pid, sourceName: null });
                }

                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: [mock], games: [mock] });

                await new Promise<void>(resolve => {
                    const listener = (data: any) => {
                        if (!isRunning) {
                            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", listener);
                            return resolve();
                        }
                        const prog = Math.floor(data.userStatus?.progress?.[taskName]?.value ?? 0);
                        if (prog >= target) {
                            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", listener);
                            updateStatus(`Finished: ${appName}`);
                            currentTimer = setTimeout(() => {
                                if (isRunning) {
                                    if (originals.getRunningGames) Stores.Games.getRunningGames = originals.getRunningGames;
                                    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [mock], added: [], games: [] });
                                }
                                resolve();
                            }, 20000);
                        }
                    };
                    FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", listener);
                });
            }
        } catch (err) {
            console.error(err);
        }
        await sleep(2000);
    }

    if (isRunning) {
        updateStatus("All Done!");
        setTimeout(() => updateStatus("Spoof Quests"), 3000);
        restoreOriginals();
        isRunning = false;
    }
}

function injectButton() {
    if (document.getElementById("quest-spoof-btn")) return;

    const headingControls = document.querySelector('div[class*="headingControls"]');

    if (headingControls) {
        const btn = document.createElement("button");
        btn.id = "quest-spoof-btn";
        btn.className = "a22cb0c66246f5d3-button a22cb0c66246f5d3-sm a22cb0c66246f5d3-secondary a22cb0c66246f5d3-hasText";

        btn.style.marginLeft = "8px";
        btn.style.backgroundColor = "var(--brand-experiment)";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "3px";
        btn.style.fontSize = "14px";
        btn.style.fontWeight = "500";
        btn.style.padding = "2px 16px";
        btn.style.cursor = "pointer";
        btn.innerText = "Spoof Quests";

        btn.onclick = e => {
            e.preventDefault();
            e.stopPropagation();
            if (isRunning) {
                isRunning = false;
                if (currentTimer) clearTimeout(currentTimer);
                updateStatus("Stopping...");
                restoreOriginals();
                setTimeout(() => updateStatus("Spoof Quests"), 1000);
            } else {
                runQuestSpoofer();
            }
        };

        headingControls.prepend(btn);
        buttonElement = btn;
    }
}

export default definePlugin({
    name: "QuestSpoofer",
    description: "Automated Quest Spoofing Engine.",
    authors: [{ name: "ParaDivus", id: 1261523694480654348n }],
    settings,
    start() {
        pollInterval = setInterval(() => {
            if (location.pathname.includes("quest")) {
                injectButton();
            }
        }, 1000);

        if (location.pathname.includes("quest")) injectButton();

        if (settings.store.autoStart) {
            setTimeout(() => {
                if (location.pathname.includes("quest")) runQuestSpoofer();
            }, 3000);
        }
    },

    stop() {
        if (pollInterval) clearInterval(pollInterval);
        isRunning = false;

        if (currentTimer) {
            clearTimeout(currentTimer);
            currentTimer = null;
        }

        if (buttonElement) {
            buttonElement.remove();
            buttonElement = null;
        }

        const btn = document.getElementById("quest-spoof-btn");
        if (btn) btn.remove();

        restoreOriginals();
    }
});
