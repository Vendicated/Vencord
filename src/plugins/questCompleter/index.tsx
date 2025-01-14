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
import { Text, UserStore } from "@webpack/common";

import { IconWithTooltip, QuestIcon } from "./components/Icons";



const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
const questAssetsBaseUrl = "https://cdn.discordapp.com/assets/quests/";


function getLeftQuests() {
    const QuestsStore = findByProps("getQuest");
    // check if user still has incompleted quests
    const quest = [...QuestsStore.quests.values()].find(quest => quest.userStatus?.enrolledAt && !quest?.userStatus?.completedAt && new Date(quest?.config?.expiresAt) >= new Date());
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

function decodeStreamKey(e: string): any {
    const t = e.split(":");
    const n = t[0];
    switch (n) {
        case "guild": {
            const [e, n, i, r] = t;
            return {
                streamType: e,
                guildId: n,
                channelId: i,
                ownerId: r
            };
        }
        case "call": {
            const [e, n, i] = t;
            return {
                streamType: e,
                channelId: n,
                ownerId: i
            };
        }
        default:
            throw new Error("Unknown stream type ".concat(n));
    }
}


let quest, interval, applicationId, applicationName, secondsNeeded, secondsDone, canPlay;
let shouldDisable = true;
let questRunning = false;
let ImagesConfig = {};

export default definePlugin({
    name: "QuestCompleter",
    description: "A plugin to complete quests without having the game.",
    authors: [Devs.Loukios],
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
        const isDesktop = navigator.userAgent.includes("discord/");

        return (<>
            {
                isDesktop ?
                    <Text variant="text-lg/bold">
                        The plugin should work properly because you are on the Desktop Client.
                    </Text>
                    :
                    <Text variant="text-lg/bold" style={{ color: "red" }}>
                        Error: This plugin only works on the Desktop Client.
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

        if (!currentStream) {
            return false;
        }

        const userIds = ApplicationStreamingStore.getViewerIds(encodeStreamKey(currentStream));
        if (!userIds.length) {
            return false;
        }

        if (!getLeftQuests()) {
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
            clearInterval(interval);
            interval = null;
            questRunning = false;
            return;
        }
        const currentStream = ApplicationStreamingStore.getCurrentUserActiveStream();
        const encodedStreamKey = encodeStreamKey(currentStream);
        quest = getLeftQuests();
        ImagesConfig = {
            icon: `${questAssetsBaseUrl}${quest.id}/reward.jpg`,
            image: `${questAssetsBaseUrl}${quest.id}/hero.jpg`
        };

        const heartBeat = async () => {
            const sendHeartbeat = findByCode("QUESTS_HEARTBEAT");
            sendHeartbeat({ questId: quest.id, streamKey: encodedStreamKey });
        };

        heartBeat();
        interval = setInterval(heartBeat, 60000); // send the heartbeat each minute
        questRunning = true;
        if (quest.config.configVersion === 1) {
            applicationId = quest.config.applicationId;
            applicationName = quest.config.applicationName;
            secondsNeeded = quest.config.streamDurationRequirementMinutes * 60;
            secondsDone = quest.userStatus?.streamProgressSeconds ?? 0;
            canPlay = quest.config.variants.includes(2);
        } else if (quest.config.configVersion === 2) {
            applicationId = quest.config.application.id;
            applicationName = quest.config.application.name;
            canPlay = quest.config.taskConfig.tasks.PLAY_ON_DESKTOP;
            const taskName = canPlay ? "PLAY_ON_DESKTOP" : "STREAM_ON_DESKTOP";
            secondsNeeded = quest.config.taskConfig.tasks[taskName].target;
            secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        }
        return;
    },
    flux: {
        STREAM_STOP: event => {
            const stream = decodeStreamKey(event.streamKey);
            // we check if the stream is by the current user id so we do not clear the interval without any reason.
            if (stream.ownerId === window.currentUserId && interval) {
                clearInterval(interval);
                interval = null;
            }
        },
        QUESTS_SEND_HEARTBEAT_FAILURE: () => {
            showNotification(
                {
                    title: "Couldn't start Completing Quest",
                    body: "You are probally using web, please check the plugin settings for help.",
                    ...ImagesConfig
                }
            );
            clearInterval(interval);
            interval = null;
        },
        QUESTS_SEND_HEARTBEAT_SUCCESS: event => {
            let progress = 0;
            if (canPlay) {
                progress = quest.config.configVersion === 1 ? event.userStatus.streamProgressSeconds : Math.floor(event.userStatus.progress.PLAY_ON_DESKTOP.value);
                // WIP - Need to add game emulation
            } else {
                progress = quest.config.configVersion === 1 ? event.userStatus.streamProgressSeconds : Math.floor(event.userStatus.progress.STREAM_ON_DESKTOP.value);
            }
            if (progress >= secondsNeeded) {
                showNotification({
                    title: `${applicationName} - Quests Completer`,
                    body: "Quest Completed",
                    ...ImagesConfig
                });
                clearInterval(interval);
                interval = null;
                return;
            } else {
                showNotification({
                    title: `${applicationName} - Quests Completer`,
                    body: `Current progress: ${Math.floor(progress / secondsNeeded * 100)}% (${Math.ceil((secondsNeeded - secondsDone) / 60)} minutes left.)`,
                    ...ImagesConfig
                });
            }
        }
    }
});
