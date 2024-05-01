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


import { Devs } from "@utils/constants";
import { findByProps } from "@webpack";
import definePlugin from "@utils/types";
import { Text } from "@webpack/common";
import { showNotification } from "@api/Notifications";
import { localStorage } from "@utils/localStorage";

interface Stream {
    streamType: string;
    state: string;
    ownerId: string;
    guildId: string;
    channelId: string;
}

function getLeftQuests() {
    const QuestsStore = findByProps("getQuest");
    // check if user still has incompleted quests
    const quest = [...QuestsStore.quests.values()].find(quest => quest.userStatus?.enrolledAt && !quest?.userStatus?.completedAt && new Date(quest?.config?.expiresAt) >= new Date());
    return quest;
}

let interval;
let quest;
let questHeroBarUrl;
let ImagesConfig = {};
const streamingUtils = findByProps("getCurrentUserActiveStream")

export default definePlugin({
    name: "QuestCompleter",
    description: "A plugin to complete quests without having the game.",
    authors: [Devs.HAPPY_ENDERMAN, Devs.SerStars],
    patches: [
        {
            find: `"invite-button"`,
            replacement: {
                match: /(function .+?\(.+?\){let{inPopout:.+allowIdle.+?}=.+?\.usePreventIdle\)\("popup"\),(.+?)=\[\];if\(.+?\){.+"chat-spacer"\)\)\),\(\d,.+?\.jsx\)\(.+?,{children:).+?}}/,
                replace: "$1[$self.renderQuestButton(),...$2]})}}"
            }
        }
    ],
    settingsAboutComponent() {
        const isDesktop = navigator.userAgent.includes("discord/");
        const hasQuestsExtensionEnabled = localStorage.getItem("QUESTS_EXT_ENABLED");

        return (<>
            {
                isDesktop || hasQuestsExtensionEnabled ?
                    <Text variant="text-lg/bold">
                        The plugin should work properly because you {isDesktop ? "are on the Desktop Client." : "installed our extension."}
                    </Text>
                    :
                    <Text variant="text-lg/bold">
                        This plugin won't work right now. Please download
                        <a href="" target="_blank">our extension</a>
                        to make the plugin work on web.
                    </Text>
            }
        </>);
    },
    start() {
        const currentUserId: string = findByProps("getCurrentUser").getCurrentUser().id;
        window.currentUserId = currentUserId; // this is here because discord will lag if we get the current user id every time
    },
    renderQuestButton() {
        const currentStream: Stream | null = streamingUtils.getCurrentUserActiveStream();
        let shouldDisable = !!interval;
        const { Divider } = findByProps("Divider", "Icon");

        if (!currentStream) {
            shouldDisable = true;
        }
        if (currentStream) {
            if (!findByProps("getParticipants").getParticipants(currentStream.channelId).filter(participent => participent.user.id !== window.currentUserId).length) {
                shouldDisable = true;
            }
            if (currentStream?.ownerId !== window.currentUserId) {
                shouldDisable = true;
            }
        }
        if (!getLeftQuests()) {
            shouldDisable = true;
        }



        const ToolTipButton = findByProps("CenterControlButton").default;
        const QuestsIcon = () => (props) => (
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
                    disabled={shouldDisable}
                    label="Complete Quest"
                    tooltipPosition="bottom"
                    iconComponent={QuestsIcon()}
                    onClick={this.openCompleteQuestUI}
                >
                </ToolTipButton>
                <Divider></Divider>

            </>
        );
    },
    openCompleteQuestUI() {
        // check if user is sharing screen and there is someone that is watching the stream 

        const currentStream: Stream | null = streamingUtils.getCurrentUserActiveStream();
        const encodedStreamKey = findByProps("encodeStreamKey").encodeStreamKey(currentStream);
        quest = getLeftQuests();
        ImagesConfig = {
            icon: findByProps("getQuestBarHeroAssetUrl").getQuestBarHeroAssetUrl(quest),
            image: findByProps("getHeroAssetUrl").getHeroAssetUrl(quest)
        };

        const heartBeat = async () => {
            const HTTP = findByProps("HTTP", "getAPIBaseURL").HTTP; // rest api module
            let res = findByProps("sendHeartbeat").sendHeartbeat({ questId: quest.id, streamKey: encodedStreamKey });
        };

        heartBeat();
        interval = setInterval(heartBeat, 120000); // send the heartbeat each 2 minutes

        return;
    },
    flux: {
        STREAM_STOP: (event) => {
            const stream: Stream = findByProps("encodeStreamKey").decodeStreamKey(event.streamKey);
            // we check if the stream is by the current user id so we do not clear the interval without any reason.
            if (stream.ownerId === window.currentUserId && interval) {
                clearInterval(interval);
                interval = null;
            }
        },
        QUESTS_SEND_HEARTBEAT_FAILURE: (event) => {
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
        QUESTS_SEND_HEARTBEAT_SUCCESS: (event) => {

            const a = event.userStatus.streamProgressSeconds * 100;
            const b = quest.config.streamDurationRequirementMinutes * 60;
            showNotification({
                title: `${quest.config.applicationName} - Quests Completer`,
                body: `Current progress: ${Math.floor(a / b)}% (${Math.floor(event.userStatus.streamProgressSeconds / 60)} minutes.)`,
                ...ImagesConfig
            });

            if (event.userStatus.streamProgressSeconds === quest.config.streamDurationRequirementMinutes * 60) {
                showNotification({
                    title: `${quest.config.applicationName} - Quests Completer`,
                    body: `Quest Completed`,
                    ...ImagesConfig
                });
                clearInterval(interval);
                interval = null;
            }
        }

    }

});
