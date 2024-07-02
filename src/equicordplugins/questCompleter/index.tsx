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

import { showNotification } from "@api/Notifications";
import { Devs, EquicordDevs } from "@utils/constants";
import { getTheme, Theme } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByCode, findByProps } from "@webpack";
import { FluxDispatcher, Forms, RestAPI, Text, UserStore } from "@webpack/common";

export default definePlugin({
    name: "QuestCompleter",
    description: "A plugin to complete quests without having the game installed.",
    authors: [Devs.HappyEnderman, EquicordDevs.SerStars, EquicordDevs.thororen],
    patches: [
        {
            find: "\"invite-button\"",
            replacement: {
                match: /(function .+?\(.+?\){let{inPopout:.+allowIdle.+?}=.+?\.\i\)\("popup"\),(.+?)=\[\];if\(.+?\){.+"chat-spacer"\)\)\),\(\d,.+?\.jsx\)\(.+?,{children:).+?}}/,
                replace: "$1[$self.renderQuestButton(),...$2]})}}"
            }
        }
    ],
    settingsAboutComponent() {
        const isDesktop = navigator.userAgent.includes("discord/");

        return (<>
            {
                isDesktop ?
                    <Text variant="text-lg/bold">
                        The plugin should work properly because you are on the Desktop Client.
                    </Text>
                    :
                    <Text variant="text-lg/bold">
                        This plugin won't work because you are not on the Desktop Client.
                    </Text>
            }
        </>);
    },
    start() {
        const currentUserId: string = UserStore.getCurrentUser().id;
        window.currentUserId = currentUserId; // this is here because discord will lag if we get the current user id every time
    },
    renderQuestButton() {
        const ToolTipButton = findByCode("}),color:\"currentColor\"})})}}");
        const QuestsIcon = () => props => (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 828 893"
            >
                <path
                    fill="#C4C9CE"
                    d="M395 732c-56.667 0-109.333-9-158-27-48-18-89.667-43.333-125-76-35.333-33.333-63-72.333-83-117C9.667 467.333 0 418.667 0 366c0-53.333 9.667-102 29-146 20-44.667 47.667-83.333 83-116 35.333-33.333 77-59 125-77C285.667 9 338.333 0 395 0c57.333 0 110 9 158 27s89.667 43.667 125 77c35.333 32.667 62.667 71.333 82 116 20 44 30 92.667 30 146 0 52.667-10 101.333-30 146-19.333 44.667-46.667 83.667-82 117-35.333 32.667-77 58-125 76s-100.667 27-158 27zm229 161c-32.667 0-63-3.333-91-10-28-6-55.333-16.333-82-31-26-14.667-53.333-35-82-61-28.667-25.333-60.667-57-96-95l244-60c16 24.667 29.667 43.667 41 57 11.333 13.333 22.333 22.667 33 28 11.333 5.333 24 8 38 8 34.667 0 67-15 97-45l102 120c-50 59.333-118 89-204 89zM395 541c22 0 42.333-4 61-12 19.333-8 36-19.333 50-34 14.667-15.333 26-33.667 34-55 8-22 12-46.667 12-74s-4-51.667-12-73c-8-22-19.333-40.333-34-55-14-15.333-30.667-27-50-35-18.667-8-39-12-61-12s-42.667 4-62 12c-18.667 8-35.333 19.667-50 35-14 14.667-25 33-33 55-8 21.333-12 45.667-12 73s4 52 12 74c8 21.333 19 39.667 33 55 14.667 14.667 31.333 26 50 34 19.333 8 40 12 62 12z"
                ></path>
            </svg>

        );

        return (
            <>
                <ToolTipButton
                    label="Complete Quest"
                    tooltipPosition="bottom"
                    iconComponent={QuestsIcon()}
                    onClick={this.openCompleteQuestUI}
                >
                </ToolTipButton>
                <Forms.FormDivider></Forms.FormDivider>

            </>
        );
    },
    async openCompleteQuestUI() {
        // check if user is sharing screen and there is someone that is watching the stream
        const ApplicationStreamingStore = findByProps("getStreamerActiveStreamMetadata");
        const RunningGameStore = findByProps("getRunningGames");
        const ExperimentStore = findByProps("getGuildExperiments");
        const QuestsStore = findByProps("getQuest");
        const quest = [...QuestsStore.quests.values()].find(quest => quest.userStatus?.enrolledAt && !quest?.userStatus?.completedAt && new Date(quest?.config?.expiresAt) >= new Date());

        const isApp = navigator.userAgent.includes("Electron/");
        if (!isApp) {
            showNotification({
                title: "Quests Completer",
                body: "This no longer works in browser. Use the desktop app!",
            });
        } else if (!quest) {
            showNotification({
                title: "Quests Completer",
                body: "No Quests To Complete",
            });
        } else {
            const pid = Math.floor(Math.random() * 30000) + 1000;
            const theme = getTheme() === Theme.Light
                ? "light"
                : "dark";

            let applicationId, applicationName, secondsNeeded, secondsDone, canPlay, icon, questId;
            if (quest.config.configVersion === 1) {
                questId = quest.id;
                applicationId = quest.config.applicationId;
                applicationName = quest.config.applicationName;
                secondsNeeded = quest.config.streamDurationRequirementMinutes * 60;
                secondsDone = quest.userStatus?.streamProgressSeconds ?? 0;
                icon = `https://cdn.discordapp.com/assets/quests/${questId}/${theme}/${quest.config.assets.gameTile}`;
                canPlay = quest.config.variants.includes(2);
            } else if (quest.config.configVersion === 2) {
                questId = quest.id;
                applicationId = quest.config.application.id;
                applicationName = quest.config.application.name;
                icon = `https://cdn.discordapp.com/assets/quests/${questId}/${theme}/${quest.config.assets.gameTile}`;
                canPlay = ExperimentStore.getUserExperimentBucket("2024-04_quest_playtime_task") > 0 && quest.config.taskConfig.tasks.PLAY_ON_DESKTOP;
                const taskName = canPlay ? "PLAY_ON_DESKTOP" : "STREAM_ON_DESKTOP";
                secondsNeeded = quest.config.taskConfig.tasks[taskName]?.target;
                secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
            }
            if (canPlay) {
                await RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
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
                            title: `${applicationName} - Quests Completer`,
                            body: `Current progress: ${progress}/${secondsNeeded} minutes.`,
                            icon: icon,
                        });

                        if (progress >= secondsNeeded) {
                            showNotification({
                                title: `${applicationName} - Quests Completer`,
                                body: "Quest Completed",
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
                });
            } else {
                const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
                ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                    id: applicationId,
                    pid,
                    sourceName: null
                });

                const fn = data => {
                    const progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                    showNotification({
                        title: `${applicationName} - Quests Completer`,
                        body: `Current progress: ${progress}/${secondsNeeded} minutes.`,
                        icon: icon,
                    });

                    if (progress >= secondsNeeded) {
                        showNotification({
                            title: `${applicationName} - Quests Completer`,
                            body: "Quest Completed",
                            icon: icon,
                        });

                        ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            }
            return;
        }
    }
});
