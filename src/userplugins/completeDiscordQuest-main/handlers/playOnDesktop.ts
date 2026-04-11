/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { callWithRetry } from "../utils/retry";
import { QuestHandler } from "./types";

export const playOnDesktopHandler: QuestHandler = {
    supports(taskName: string) {
        return taskName === "PLAY_ON_DESKTOP";
    },

    handle({ quest, questName, secondsNeeded, secondsDone, applicationId, applicationName, pid, isApp, RestAPI, FluxDispatcher, RunningGameStore, completingQuest, fakeGames, addFakeGame, removeFakeGame, getSpoofingProfile, onQuestComplete }) {
        if (!isApp) {
            console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!");
            return;
        }

        callWithRetry(() => RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` }), { label: "applications/public" }).then(res => {
            const appData = (res as any).body[0];
            const exeName = appData.executables.find(x => x.os === "win32").name.replace(">", "");

            const fakeGame = {
                cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                exeName,
                exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                hidden: false,
                isLauncher: false,
                id: applicationId,
                name: appData.name,
                pid: pid,
                pidPath: [pid],
                processName: appData.name,
                start: Date.now(),
            };
            const realGames = fakeGames.size === 0 ? RunningGameStore.getRunningGames() : [];
            addFakeGame(quest.id, fakeGame);
            const fakeGames2 = Array.from(fakeGames.values());
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames2 });

            const cleanupAndFinish = (completed: boolean) => {
                removeFakeGame(quest.id);
                const games = RunningGameStore.getRunningGames();
                const added = fakeGames.size === 0 ? games : [];
                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: added, games: games });

                if (completed) {
                    console.log("Quest completed!");
                    onQuestComplete();
                } else {
                    completingQuest.set(quest.id, false);
                }
            };

            const playOnDesktop = async () => {
                console.log(`Spoofed your game to ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);

                while (true) {
                    if (!completingQuest.get(quest.id)) {
                        console.log("Stopping completing quest:", questName);
                        cleanupAndFinish(false);
                        break;
                    }

                    let res;
                    try {
                        res = await callWithRetry(() => RestAPI.post({
                            url: `/quests/${quest.id}/heartbeat`,
                            body: { stream_key: null, terminal: false }
                        }), { label: "heartbeat" });
                    } catch (err) {
                        console.error("Heartbeat failed after retries, stopping quest:", questName, err);
                        cleanupAndFinish(false);
                        break;
                    }

                    const progress = Math.floor(res.body.progress?.PLAY_ON_DESKTOP?.value ?? 0);
                    console.log(`Quest progress ${questName}: ${progress}/${secondsNeeded}`);

                    if (progress >= secondsNeeded) {
                        console.log("Stopping completing quest:", questName);
                        try {
                            await callWithRetry(() => RestAPI.post({
                                url: `/quests/${quest.id}/heartbeat`,
                                body: { stream_key: null, terminal: true }
                            }), { label: "heartbeat-terminal" });
                        } catch (err) {
                            console.error("Terminal heartbeat failed after retries for quest:", questName, err);
                        }
                        cleanupAndFinish(true);
                        break;
                    }

                    const { playActivity: playActivityProfile } = getSpoofingProfile();
                    await new Promise(resolve => setTimeout(resolve, playActivityProfile.intervalMs));
                }
            };

            playOnDesktop();
        }).catch(err => {
            console.error("Failed to fetch application data for quest", questName, err);
            completingQuest.set(quest.id, false);
        });
    }
};
