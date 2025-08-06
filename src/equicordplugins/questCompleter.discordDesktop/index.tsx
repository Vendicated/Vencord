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
import "./style.css";

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { ErrorBoundary } from "@components/index";
import { Devs } from "@utils/constants";
import { getTheme, Theme } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps, findComponentByCodeLazy } from "@webpack";
import { Button, ChannelStore, FluxDispatcher, GuildChannelStore, NavigationRouter, RestAPI, Tooltip, UserStore } from "@webpack/common";

const QuestIcon = findComponentByCodeLazy("10.47a.76.76");
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

let questIdCheck = 0;

function ToolBarHeader() {
    return (
        <ErrorBoundary noop={true}>
            <HeaderBarIcon
                tooltip="Complete Quest"
                position="bottom"
                className="vc-quest-completer"
                icon={QuestIcon}
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
            body: "No Quests To Complete. Click to navigate to the quests tab",
            onClick() {
                NavigationRouter.transitionTo("/discovery/quests");
            },
        });
    } else {
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const theme = getTheme() === Theme.Light
            ? "light"
            : "dark";

        const applicationId = quest.config.application.id;
        const applicationName = quest.config.application.name;
        const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => quest.config.taskConfigV2.tasks[x] != null);
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
                showNotification({
                    title: `${applicationName} - Quest Completer`,
                    body: "Quest Completed.",
                    icon: icon,
                });
            };
            fn();
            showNotification({
                title: `${applicationName} - Quest Completer`,
                body: `Spoofing video for ${applicationName}.`,
                icon: icon,
            });
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

                        RunningGameStore.getRunningGames = realGetRunningGames;
                        RunningGameStore.getGameForPID = realGetGameForPID;
                        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                showNotification({
                    title: `${applicationName} - Quest Completer`,
                    body: `Spoofed your application to ${applicationName}.`,
                    icon: icon,
                });
            });
        } else if (taskName === "STREAM_ON_DESKTOP") {
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
            showNotification({
                title: `${applicationName} - Quest Completer`,
                body: `Stream any window in vc for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`,
                icon: icon,
            });
            showNotification({
                title: `${applicationName} - Quest Completer`,
                body: "Remember that you need at least 1 other person to be in the vc!",
                icon: icon,
            });
        } else if (taskName === "PLAY_ACTIVITY") {
            const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds() as any[]).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
            const streamKey = `call:${channelId}:1`;

            const fn = async () => {

                while (true) {
                    const res = await RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                    const progress = res.body.progress.PLAY_ACTIVITY.value;
                    showNotification({
                        title: `${applicationName} - Quest Completer`,
                        body: `Current progress: ${progress}/${secondsNeeded} seconds.`,
                        icon: icon,
                    });

                    await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                    if (progress >= secondsNeeded) {
                        await RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                        break;
                    }
                }

                showNotification({
                    title: `${applicationName} - Quest Completer`,
                    body: "Quest Completed.",
                    icon: icon,
                });
            };
            fn();
        }
        return;
    }
}

const settings = definePluginSettings({
    useNavBar: {
        description: "Move quest button down to the server nav bar",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

export default definePlugin({
    name: "QuestCompleter",
    description: "A plugin to complete quests without having the game installed.",
    authors: [Devs.amia],
    settings,
    patches: [
        {
            find: "BkZhUF)}",
            replacement: {
                match: /(?<=questId:(\i\.id).*?\.PRIMARY,)disabled:!0/,
                replace: "onClick: () => $self.mobileQuestPatch($1)"
            },
        },
        {
            find: "AppTitleBar",
            replacement: {
                match: /(?<=trailing:.{0,70}\(\i\.Fragment,{children:\[)/,
                replace: "$self.renderQuestButton(),"
            },
            predicate: () => !settings.store.useNavBar
        },
        {
            find: ".controlButtonWrapper,",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,200}mobileToolbar)/,
                replace: "$1$self.toolbarAction(arguments[0]);$2"
            },
            predicate: () => settings.store.useNavBar
        }
    ],
    mobileQuestPatch(questId) {
        if (questId === questIdCheck) return;
        questIdCheck = questId;
        Vencord.Webpack.Common.RestAPI.post({
            url: `/quests/${questId}/enroll`,
            body: {
                location: 11
            }
        });
    },
    renderQuestButton() {
        return (
            <Tooltip text="Complete Quest">
                {tooltipProps => (
                    <Button style={{ backgroundColor: "transparent", border: "none" }}
                        {...tooltipProps}
                        size={Button.Sizes.SMALL}
                        className={"vc-quest-completer-icon"}
                        onClick={openCompleteQuestUI}
                    >
                        <QuestIcon width={20} height={20} size={Button.Sizes.SMALL} />
                    </Button>
                )}
            </Tooltip>
        );
    },
    toolbarAction(e) {
        if (Array.isArray(e.toolbar))
            return e.toolbar.unshift(
                <ErrorBoundary noop={true}>
                    <ToolBarHeader />
                </ErrorBoundary>
            );

        e.toolbar = [
            <ErrorBoundary noop={true} key={"QuestCompleter"}>
                <ToolBarHeader />
            </ErrorBoundary>,
            e.toolbar,
        ];
    }
});
