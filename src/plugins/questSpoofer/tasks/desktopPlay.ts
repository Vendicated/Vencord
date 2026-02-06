/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Quest } from "@vencord/discord-types";
import { QuestSpooferLogger, RunningGameStore } from "@plugins/questSpoofer/constants";
import { claimQuestReward } from "@plugins/questSpoofer/helpers";
import { FluxDispatcher, RestAPI, showToast, Toasts } from "@webpack/common";

/**
 * Spoofs a desktop play quest by injecting a fake running game into the game store
 * and waiting for quest heartbeat progress to reach the required duration.
 */
export async function spoofDesktopPlayQuest(
    quest: Quest,
    appId: string,
    appName: string,
    pid: number,
    secondsNeeded: number,
) {
    if (!IS_DISCORD_DESKTOP) {
        QuestSpooferLogger.error("Not in desktop environment.");
        return showToast(
            "❌ Use the desktop app to spoof this quest.",
            Toasts.Type.FAILURE,
        );
    }

    try {
        const res = await RestAPI.get({
            url: `/applications/public?application_ids=${appId}`,
        });
        const app = res.body[0];
        const exeName = app.executables
            .find((x: { os: string; }) => x.os === "win32")
            ?.name.replace(">", "");

        const fakeGame = {
            cmdLine: `C:\\Program Files\\${app.name}\\${exeName}`,
            exeName,
            exePath: `c:/program files/${app.name.toLowerCase()}/${exeName}`,
            hidden: false,
            isLauncher: false,
            id: appId,
            name: app.name,
            pid,
            pidPath: [pid],
            processName: app.name,
            start: Date.now(),
        };

        QuestSpooferLogger.log(
            `Injecting fake game process: ${exeName} (pid ${pid})`,
        );

        const realGames = RunningGameStore.getRunningGames();
        const backupGetGames = RunningGameStore.getRunningGames;
        const backupGetByPid = RunningGameStore.getGameForPID;

        RunningGameStore.getRunningGames = () => [fakeGame];
        RunningGameStore.getGameForPID = () => fakeGame;

        await FluxDispatcher.dispatch({
            type: "RUNNING_GAMES_CHANGE",
            removed: realGames,
            added: [fakeGame],
            games: [fakeGame],
        });

        const listener = async (data: any) => {
            const progress =
                (quest.config.configVersion ?? quest.config.config_version) === 1
                    ? data.userStatus.streamProgressSeconds
                    : Math.floor(
                        data.userStatus.progress.PLAY_ON_DESKTOP.value,
                    );

            QuestSpooferLogger.debug(
                `Heartbeat received: ${progress}/${secondsNeeded}s`,
            );

            if (progress >= secondsNeeded) {
                FluxDispatcher.unsubscribe(
                    "QUESTS_SEND_HEARTBEAT_SUCCESS",
                    listener,
                );
                RunningGameStore.getRunningGames = backupGetGames;
                RunningGameStore.getGameForPID = backupGetByPid;
                FluxDispatcher.dispatch({
                    type: "RUNNING_GAMES_CHANGE",
                    removed: [fakeGame],
                    added: [],
                    games: [],
                });

                showToast(
                    "✅ Desktop play quest completed!",
                    Toasts.Type.SUCCESS,
                );
                QuestSpooferLogger.info(
                    "Desktop play quest spoofed successfully.",
                );

                const claimResult = await claimQuestReward(quest.id);
                if (claimResult.status === "captcha") {
                    showToast(
                        "⚠️ Quest reward requires captcha. Claim manually in Discord.",
                        Toasts.Type.MESSAGE,
                    );
                } else if (claimResult.status === "error") {
                    showToast(
                        "Quest reward claim failed. See console for details.",
                        Toasts.Type.FAILURE,
                    );
                }
            }
        };

        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", listener);
        showToast(`🎮 Spoofing game: ${appName}`, Toasts.Type.MESSAGE);
    } catch (err) {
        QuestSpooferLogger.error("Failed to fetch application data.", err);
    }
}
