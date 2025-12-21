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

import "./style.css";

import { HeaderBarButton } from "@api/HeaderBar";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Notice } from "@components/Notice";
import { Devs } from "@utils/constants";
import { getTheme, Theme } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, GuildChannelStore, NavigationRouter, RestAPI, UserStore } from "@webpack/common";

const QuestIcon = findComponentByCodeLazy("10.47a.76.76");
const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
const RunningGameStore = findStoreLazy("RunningGameStore");
const QuestsStore = findByPropsLazy("getQuest");

function ToolBarHeader() {
    return (
        <HeaderBarButton
            tooltip="Complete Quest"
            position="bottom"
            className="vc-quest-completer"
            icon={QuestIcon}
            onClick={openCompleteQuestUI}
        />
    );
}

async function openCompleteQuestUI() {
    const quest = [...QuestsStore.quests.values()].find(x => x.id !== "1412491570820812933" && x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now());

    if (!quest) {
        showNotification({
            title: "Quest Completer",
            body: "No Quests To Complete. Click to navigate to the quests tab",
            onClick() {
                NavigationRouter.transitionTo("/quest-home");
            },
        });
    } else {
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const theme = getTheme() === Theme.Light
            ? "light"
            : "dark";

        const applicationId = quest.config.application.id;
        const applicationName = quest.config.application.name;
        const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE", "ACHIEVEMENT_IN_ACTIVITY"].find(x => quest.config.taskConfigV2.tasks[x] != null);
        const icon = `https://cdn.discordapp.com/quests/${quest.id}/${theme}/${quest.config.assets.gameTile}`;
        // @ts-ignore
        const secondsNeeded = quest.config.taskConfigV2.tasks[taskName].target;
        // @ts-ignore
        let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const maxFuture = 10, speed = 7, interval = 1;
            const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
            const fn = async () => {
                while (true) {
                    const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                    const diff = maxAllowed - secondsDone;
                    const timestamp = secondsDone + speed;
                    if (diff >= speed) {
                        await RestAPI.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
                        secondsDone = Math.min(secondsNeeded, timestamp);
                    }
                    if (timestamp >= secondsNeeded) {
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, interval * 1000));
                }
                if (!settings.store.disableNotifications) {
                    showNotification({
                        title: `${applicationName} - Quest Completer`,
                        body: "Quest Completed.",
                        icon: icon,
                    });
                }
            };
            fn();
        } else if (taskName === "PLAY_ON_DESKTOP") {
            RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
                const appData = res.body[0];
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
                const realGames = RunningGameStore.getRunningGames();
                const fakeGames = [fakeGame];
                const realGetRunningGames = RunningGameStore.getRunningGames;
                const realGetGameForPID = RunningGameStore.getGameForPID;
                RunningGameStore.getRunningGames = () => fakeGames;
                RunningGameStore.getGameForPID = pid => fakeGames.find(x => x.pid === pid);
                FluxDispatcher.dispatch({
                    type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames
                });

                const fn = data => {
                    const progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);

                    if (progress >= secondsNeeded) {
                        if (!settings.store.disableNotifications) {
                            showNotification({
                                title: `${applicationName} - Quest Completer`,
                                body: "Quest Completed.",
                                icon: icon,
                            });
                        }

                        RunningGameStore.getRunningGames = realGetRunningGames;
                        RunningGameStore.getGameForPID = realGetGameForPID;
                        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            });
        } else if (taskName === "STREAM_ON_DESKTOP") {
            const stream = ApplicationStreamingStore.getAnyStreamForUser(UserStore.getCurrentUser()?.id);
            if (!stream && !settings.store.disableNotifications) {
                showNotification({
                    title: "You're not streaming - Quest Completer",
                    body: `${applicationName} requires you to be streaming.\nPlease stream any window in vc. Make sure 1 other user is watching.`,
                    icon: icon,
                });
            }
            const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                id: applicationId,
                pid,
                sourceName: null
            });

            const fn = data => {
                const progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                if (progress >= secondsNeeded) {
                    if (!settings.store.disableNotifications) {
                        showNotification({
                            title: `${applicationName} - Quest Completer`,
                            body: "Quest Completed.",
                            icon: icon,
                        });
                    }

                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                }
            };
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
        } else if (taskName === "PLAY_ACTIVITY") {
            const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds() as any[]).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
            const streamKey = `call:${channelId}:1`;

            const fn = async () => {

                while (true) {
                    const res = await RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                    const progress = res.body.progress.PLAY_ACTIVITY.value;

                    await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                    if (progress >= secondsNeeded) {
                        await RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                        break;
                    }
                }
                if (!settings.store.disableNotifications) {
                    showNotification({
                        title: `${applicationName} - Quest Completer`,
                        body: "Quest Completed.",
                        icon: icon,
                    });
                }
            };
            fn();
        }
        return;
    }
}

const settings = definePluginSettings({
    disableNotifications: {
        type: OptionType.BOOLEAN,
        description: "Disable notifications when no quests are available or when a quest is completed - still shows no quests notif",
        default: false,
    },
});

export default definePlugin({
    name: "QuestCompleter",
    description: "Adds a button to the header bar to complete quests without having the game installed.",
    authors: [Devs.amia],
    settings,
    settingsAboutComponent: () => (
        <Notice.Info>
            You must manually accept the quest first before clicking the button.
        </Notice.Info>
    ),
    headerBarButton: {
        icon: QuestIcon,
        render: ToolBarHeader
    }
});
