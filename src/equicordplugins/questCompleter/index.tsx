/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "@equicordplugins/_misc/styles.css";

import { showNotification } from "@api/Notifications";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getTheme, Theme } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByProps, findExportedComponentLazy } from "@webpack";
import { Button, FluxDispatcher, Forms, RestAPI, Tooltip, UserStore } from "@webpack/common";
const HeaderBarIcon = findExportedComponentLazy("Icon", "Divider");
const isApp = navigator.userAgent.includes("Electron/");

import "./style.css";

function ToolBarQuestsIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            className={classes("vc-quest-completer-icon")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z"
            />
        </svg>
    );
}

function ToolBarHeader() {
    return (
        <ErrorBoundary noop={true}>
            <HeaderBarIcon
                tooltip="Complete Quest"
                position="bottom"
                className="vc-quest-completer"
                icon={ToolBarQuestsIcon}
                onClick={openCompleteQuestUI}
            >
            </HeaderBarIcon>
        </ErrorBoundary>
    );
}

async function openCompleteQuestUI() {
    const ApplicationStreamingStore = findByProps("getStreamerActiveStreamMetadata");
    const RunningGameStore = findByProps("getRunningGames");
    const QuestsStore = findByProps("getQuest");
    const quest = [...QuestsStore.quests.values()].find(x => x.id !== "1248385850622869556" && x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now());

    if (!quest) {
        showNotification({
            title: "Quest Completer",
            body: "No Quests To Complete",
        });
    } else {
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const theme = getTheme() === Theme.Light
            ? "light"
            : "dark";

        const applicationId = quest.config.application.id;
        const applicationName = quest.config.application.name;
        const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP"].find(x => quest.config.taskConfig.tasks[x] != null);
        // @ts-ignore
        const secondsNeeded = quest.config.taskConfig.tasks[taskName].target;
        // @ts-ignore
        const secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        const icon = `https://cdn.discordapp.com/assets/quests/${quest.id}/${theme}/${quest.config.assets.gameTile}`;
        if (taskName === "WATCH_VIDEO") {
            const tolerance = 2, speed = 10;
            const diff = Math.floor((Date.now() - new Date(quest.userStatus.enrolledAt).getTime()) / 1000);
            const startingPoint = Math.min(Math.max(Math.ceil(secondsDone), diff), secondsNeeded);
            const fn = async () => {
                for (let i = startingPoint; i <= secondsNeeded; i += speed) {
                    try {
                        await RestAPI.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, i + Math.random()) } });
                    } catch (ex) {
                        console.log("Failed to send increment of", i, ex);
                    }
                    await new Promise(resolve => setTimeout(resolve, tolerance * 1000));
                }
                if ((secondsNeeded - secondsDone) % speed !== 0) {
                    await RestAPI.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
                    showNotification({
                        title: `${applicationName} - Quest Completer`,
                        body: "Quest Completed.",
                        icon: icon,
                    });
                }
            };
            fn();
            showNotification({
                title: `${applicationName} - Quest Completer`,
                body: `Wait for ${Math.ceil((secondsNeeded - startingPoint) / speed * tolerance)} more seconds.`,
                icon: icon,
            });
            console.log(`Spoofing video for ${applicationName}.`);
        } else if (taskName === "PLAY_ON_DESKTOP") {
            if (!isApp) {
                showNotification({
                    title: `${applicationName} - Quest Completer`,
                    body: `${applicationName}'s quest requires the desktop app.`,
                    icon: icon,
                });
            }
            RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
                const appData = res.body[0];
                const exeName = appData.executables.find(x => x.os === "win32").name.replace(">", "");

                const games = RunningGameStore.getRunningGames();
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
                games.push(fakeGame);
                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: [fakeGame], games: games });

                const fn = data => {
                    const progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                    showNotification({
                        title: `${applicationName} - Quest Completer`,
                        body: `Current progress: ${progress}/${secondsNeeded} seconds.`,
                        icon: icon,
                    });

                    if (progress >= secondsNeeded) {
                        showNotification({
                            title: `${applicationName} - Quest Completer`,
                            body: "Quest Completed.",
                            icon: icon,
                        });

                        const idx = games.indexOf(fakeGame);
                        if (idx > -1) {
                            games.splice(idx, 1);
                            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                        }
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                console.log(`Spoofed your game to ${applicationName}.`);
            });
        } else if (taskName === "STREAM_ON_DESKTOP") {
            if (!isApp) {
                showNotification({
                    title: `${applicationName} - Quest Completer`,
                    body: `${applicationName}'s quest requires the desktop app.`,
                    icon: icon,
                });
            }
            const stream = ApplicationStreamingStore.getAnyStreamForUser(UserStore.getCurrentUser()?.id);
            if (!stream) {
                showNotification({
                    title: "You're not streaming - Quest Completer",
                    body: `${applicationName} requires you to be streaming.\nPlease stream any window in vc.`,
                    icon: icon,
                });
            }
            showNotification({
                title: `${applicationName} - Quest Completer`,
                body: "Remember that you need at least 1 other person to be in the vc!",
                icon: icon,
            });
            const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                id: applicationId,
                pid,
                sourceName: null
            });

            const fn = data => {
                const progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                showNotification({
                    title: `${applicationName} - Quest Completer`,
                    body: `Current progress: ${progress}/${secondsNeeded} seconds.`,
                    icon: icon,
                });

                if (progress >= secondsNeeded) {
                    showNotification({
                        title: `${applicationName} - Quest Completer`,
                        body: "Quest Completed.",
                        icon: icon,
                    });

                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                }
            };
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            console.log(`Spoofed your stream to ${applicationName}.`);
        }
        return;
    }
}

export default definePlugin({
    name: "QuestCompleter",
    description: "A plugin to complete quests without having the game installed.",
    authors: [Devs.amia],
    settingsAboutComponent: () => <>
        <Forms.FormText className="plugin-warning">
            Game Quests do not work on Equibop/Web Platforms. Only Video Quests do.
        </Forms.FormText>
    </>,
    patches: [
        {
            find: "\"invite-button\"",
            replacement: {
                match: /\i&&(\i\i\.push).{0,50}"current-speaker"/,
                replace: "$1($self.renderQuestButton()),$&"
            }
        },
        {
            find: "toolbar:function",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,300}mobileToolbar)/,
                replace: "$1$self.toolbarAction(arguments[0]);$2"
            }
        }
    ],
    renderQuestButton() {
        return (
            <Tooltip text="Complete Quest">
                {tooltipProps => (
                    <Button style={{ backgroundColor: "transparent" }}
                        {...tooltipProps}
                        size={"25"}
                        className={"vc-quest-completer-icon"}
                        onClick={openCompleteQuestUI}
                    >
                        <ToolBarQuestsIcon />
                    </Button>
                )}
            </Tooltip>
        );
    },
    toolbarAction(e) {
        if (Array.isArray(e.toolbar))
            return e.toolbar.push(
                <ErrorBoundary noop={true}>
                    <ToolBarHeader />
                </ErrorBoundary>
            );

        e.toolbar = [
            <ErrorBoundary noop={true} key={"QuestCompleter"} >
                <ToolBarHeader />
            </ErrorBoundary>,
            e.toolbar,
        ];
    }
});
