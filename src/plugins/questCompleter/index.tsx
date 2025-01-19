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
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCode, findByProps, findStoreLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, GuildChannelStore, RestAPI, Text, UserStore } from "@webpack/common";

import { IconWithTooltip, QuestIcon } from "./components/Icons";



const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
const questAssetsBaseUrl = "https://cdn.discordapp.com/quests/";


function getLeftQuests() {
    const QuestsStore = findByProps("getQuest");
    // check if user still has incompleted quests
    const quest = [...QuestsStore.quests.values()].find(quest => quest.userStatus?.enrolledAt && !quest?.userStatus?.completedAt && new Date(quest?.config?.expiresAt).getTime() > Date.now());
    return quest;
}

function encodeStreamKey(e): string {
    const { streamType: t, guildId: n, channelId: r, ownerId: s } = e;
    switch (t) {
        case "guild":
            if (!n) {
                throw new Error("guildId is required for streamType GUILD");
            }
            return [t, n, r, s].join(":");
        case "call":
            return [t, r, s].join(":");
        default:
            throw new Error("Unknown stream type ".concat(t));
    }
}



// let quest, interval, applicationId, applicationName, secondsNeeded, secondsDone, taskName;
const isApp = navigator.userAgent.includes("Electron/");
let shouldDisable = true;
let questRunning = false;
let ImagesConfig = {};

export default definePlugin({
    name: "QuestCompleter",
    description: "A plugin to complete quests without having the game.",
    authors: [Devs.Loukious],
    patches: [
        {
            find: "\"invite-button\"",
            replacement: {
                match: /\)\),\(0,(\w{1,3})\.(\w{1,3})\)\((\w{1,3})\.Fragment,{children:(\w{1,3})}\)\}\}/,
                replace: ")),$4.unshift($self.getComp()),(0,$1.$2)($3.Fragment,{children:$4})}}"
            }
        }
    ],
    getComp() {
        shouldDisable = !this.renderQuestButton();
        return <IconWithTooltip text="Complete Quest" isDisabled={shouldDisable} icon={<QuestIcon />} onClick={this.openCompleteQuest} />;
    },
    settingsAboutComponent() {

        return (<>
            {
                isApp ?
                    <Text variant="text-lg/bold">
                        The plugin should work properly because you are on the Desktop Client.
                    </Text>
                    :
                    <Text variant="text-lg/bold" style={{ color: "red" }}>
                        Error: This plugin only works for non-video quests in the browser.
                    </Text>
            }

        </>);
    },
    start() {
        const currentUserId: string = UserStore.getCurrentUser().id;
        window.currentUserId = currentUserId; // this is here because discord will lag if we get the current user id every time
    },
    renderQuestButton() {
        const currentStream = ApplicationStreamingStore.getCurrentUserActiveStream();

        const quest = getLeftQuests();
        if (!quest) {
            return false;
        }

        const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"].find(x => quest.config.taskConfig.tasks[x] != null);


        if (!currentStream && taskName === "STREAM_ON_DESKTOP") {
            return false;
        }

        if (currentStream && !ApplicationStreamingStore.getViewerIds(encodeStreamKey(currentStream)).length && taskName === "STREAM_ON_DESKTOP") {
            return false;
        }

        return true;
    },

    openCompleteQuest() {
        // check if user is sharing screen and there is someone that is watching the stream
        if (questRunning) {
            showNotification({
                title: "Quest Completer",
                body: "Stopping the current quest completion.",
                ...ImagesConfig
            });
            questRunning = false;
            return;
        }
        const quest = getLeftQuests();
        ImagesConfig = {
            icon: `${questAssetsBaseUrl}${quest.id}/dark/${quest.config.assets.logotype}`,
            image: `${questAssetsBaseUrl}${quest.id}/${quest.config.assets.hero}`
        };
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const applicationId = quest.config.application.id;
        const applicationName = quest.config.application.name;
        const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"].find(x => quest.config.taskConfig.tasks[x] != null);
        const secondsNeeded = taskName ? quest.config.taskConfig.tasks[taskName].target : 0;
        const secondsDone = taskName ? quest.userStatus?.progress?.[taskName]?.value ?? 0 : 0;
        const questsHeartbeat = findByCode("QUESTS_HEARTBEAT");
        const questsVideoProgress = findByCode("QUESTS_VIDEO_PROGRESS");
        const RunningGameStore = findStoreLazy("RunningGameStore");
        questRunning = true;

        if (taskName === "WATCH_VIDEO") {
            const tolerance = 2, speed = 10;
            const diff = Math.floor((Date.now() - new Date(quest.userStatus.enrolledAt).getTime()) / 1000);
            const startingPoint = Math.min(Math.max(Math.ceil(secondsDone), diff), secondsNeeded);
            const fn = async () => {
                for (let i = startingPoint; i <= secondsNeeded; i += speed) {
                    if (!questRunning) break;
                    try {
                        questsVideoProgress(quest.id, Math.min(secondsNeeded, i + Math.random()));
                    } catch {
                        showNotification(
                            {
                                title: "Error",
                                body: "Failed to send increment of " + i,
                                ...ImagesConfig
                            }
                        );
                    }
                    await new Promise(resolve => setTimeout(resolve, tolerance * 1000));
                }
                if (questRunning && (secondsNeeded - secondsDone) % speed !== 0) {
                    questsVideoProgress(quest.id, secondsNeeded);
                }
                if (questRunning) {
                    showNotification({
                        title: `${applicationName} - Quests Completer`,
                        body: "Quest Completed",
                        ...ImagesConfig
                    });
                }
            };
            fn();
            showNotification(
                {
                    title: `${applicationName} - Quests Completer`,
                    body: `Spoofing video for ${applicationName}. Wait for ${Math.ceil((secondsNeeded - startingPoint) / speed * tolerance)} more seconds.`,
                    ...ImagesConfig
                }
            );
        } else if (taskName === "PLAY_ON_DESKTOP") {
            if (!isApp) {
                showNotification(
                    {
                        title: "Error",
                        body: "This no longer works in browser for non-video quests. Use the desktop app to complete the " + applicationName + " quest!",
                        ...ImagesConfig
                    }
                );
                questRunning = false;
                return;
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
                    if (!questRunning) {
                        // Remove the fake game and unsubscribe when questRunning is false
                        const idx = games.indexOf(fakeGame);
                        if (idx > -1) {
                            games.splice(idx, 1);
                            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: games });
                        }
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        showNotification({
                            title: "Quest Completer",
                            body: "Quest stopped.",
                            ...ImagesConfig
                        });
                        return;
                    }
                    const progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                    showNotification({
                        title: `${applicationName} - Quests Completer`,
                        body: `Current progress: ${Math.floor(progress / secondsNeeded * 100)}% (${Math.ceil((secondsNeeded - progress) / 60)} minutes left.)`,
                        ...ImagesConfig
                    });

                    if (progress >= secondsNeeded) {
                        showNotification({
                            title: `${applicationName} - Quests Completer`,
                            body: "Quest Completed",
                            ...ImagesConfig
                        });

                        const idx = games.indexOf(fakeGame);
                        if (idx > -1) {
                            games.splice(idx, 1);
                            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                        }
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        questRunning = false;
                        return;
                    }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);

                showNotification({
                    title: `${applicationName} - Quests Completer`,
                    body: `Spoofed your game to ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`,
                    ...ImagesConfig
                });
            });
        } else if (taskName === "STREAM_ON_DESKTOP") {
            if (!isApp) {
                showNotification({
                    title: "Error",
                    body: "This no longer works in browser for non-video quests. Use the desktop app to complete the " + applicationName + " quest!",
                    ...ImagesConfig
                });
                questRunning = false;
                return;
            }

            const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                id: applicationId,
                pid,
                sourceName: null
            });

            const fn = data => {
                if (!questRunning) {
                    // Stop spoofing the stream and unsubscribe when questRunning is false
                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc; // Restore the real function
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    showNotification({
                        title: "Quest Completer",
                        body: "Quest stopped.",
                        ...ImagesConfig
                    });
                    return;
                }

                const progress = quest.config.configVersion === 1
                    ? data.userStatus.streamProgressSeconds
                    : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);

                showNotification({
                    title: `${applicationName} - Quests Completer`,
                    body: `Current progress: ${Math.floor(progress / secondsNeeded * 100)}% (${Math.ceil((secondsNeeded - progress) / 60)} minutes left.)`,
                    ...ImagesConfig
                });

                if (progress >= secondsNeeded) {
                    showNotification({
                        title: `${applicationName} - Quests Completer`,
                        body: "Quest Completed",
                        ...ImagesConfig
                    });

                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    questRunning = false;
                    return;
                }
            };
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);

            showNotification({
                title: `${applicationName} - Quests Completer`,
                body: `Spoofed your stream to ${applicationName}. Stream any window in vc for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`,
                ...ImagesConfig
            });
        } else if (taskName === "PLAY_ACTIVITY") {
            const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? (Object.values(GuildChannelStore.getAllGuilds()) as any[])
                .find(x => x?.VOCAL?.length > 0)?.VOCAL?.[0].channel?.id ?? null;
            const streamKey = `call:${channelId}:1`;

            const fn = async () => {
                showNotification({
                    title: `${applicationName} - Quests Completer`,
                    body: `Completing quest ${quest.config.messages.questName}`,
                    ...ImagesConfig
                });

                while (questRunning) {
                    const res = await questsHeartbeat({ questId: quest.id, streamKey: streamKey, terminal: false });
                    const progress = res.body.progress.PLAY_ACTIVITY.value;
                    showNotification({
                        title: `${applicationName} - Quests Completer`,
                        body: `Current progress: ${Math.floor(progress / secondsNeeded * 100)}% (${Math.ceil((secondsNeeded - progress) / 60)} minutes left.)`,
                        ...ImagesConfig
                    });

                    if (progress >= secondsNeeded) {
                        showNotification({
                            title: `${applicationName} - Quests Completer`,
                            body: "Quest Completed",
                            ...ImagesConfig
                        });
                        await questsHeartbeat({ questId: quest.id, stream_key: streamKey, terminal: true });
                        questRunning = false;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 20 * 1000));
                }
                if (!questRunning) {
                    showNotification({
                        title: "Quest Completer",
                        body: "Quest stopped.",
                        ...ImagesConfig
                    });
                    return;
                }
            };
            fn();
        }
    }
});
