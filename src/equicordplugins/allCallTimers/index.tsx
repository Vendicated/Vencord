/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { PassiveUpdateState, VoiceState } from "@vencord/discord-types";
import { FluxDispatcher, GuildStore, UserStore } from "@webpack/common";

import { Timer } from "./Timer";

export const settings = definePluginSettings({
    showWithoutHover: {
        type: OptionType.BOOLEAN,
        description: "Always show the timer without needing to hover",
        restartNeeded: true,
        default: true
    },
    showRoleColor: {
        type: OptionType.BOOLEAN,
        description: "Show the user's role color (if this plugin in enabled)",
        restartNeeded: false,
        default: true
    },
    trackSelf: {
        type: OptionType.BOOLEAN,
        description: "Also track yourself",
        restartNeeded: false,
        default: true
    },
    showSeconds: {
        type: OptionType.BOOLEAN,
        description: "Show seconds in the timer",
        restartNeeded: false,
        default: true
    },
    format: {
        type: OptionType.SELECT,
        description: "Compact or human readable format:",
        options: [
            {
                label: "30:23:00:42",
                value: "stopwatch",
                default: true
            },
            {
                label: "30d 23h 00m 42s",
                value: "human"
            }
        ]
    },
    watchLargeGuilds: {
        type: OptionType.BOOLEAN,
        description: "Track users in large guilds. This may cause lag if you're in a lot of large guilds with active voice users. Tested with up to 2000 active voice users with no issues.",
        restartNeeded: true,
        default: false
    }
});


// Save the join time of all users in a Map
type userJoinData = { channelId: string, time: number; guildId: string; };
const userJoinTimes = new Map<string, userJoinData>();

/**
 * The function `addUserJoinTime` stores the join time of a user in a specific channel within a guild.
 * @param {string} userId - The `userId` parameter is a string that represents the unique identifier of
 * the user who is joining a channel in a guild.
 * @param {string} channelId - The `channelId` parameter represents the unique identifier of the
 * channel where the user joined.
 * @param {string} guildId - The `guildId` parameter in the `addUserJoinTime` function represents the
 * unique identifier of the guild (server) to which the user belongs. It is used to associate the
 * user's join time with a specific guild within the application or platform.
 */
function addUserJoinTime(userId: string, channelId: string, guildId: string) {
    // create a random number
    userJoinTimes.set(userId, { channelId, time: Date.now(), guildId });
}

/**
 * The function `removeUserJoinTime` removes the join time of a user identified by their user ID.
 * @param {string} userId - The `userId` parameter is a string that represents the unique identifier of
 * a user whose join time needs to be removed.
 */
function removeUserJoinTime(userId: string) {
    userJoinTimes.delete(userId);
}

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

// Allow user updates on discord first load
let runOneTime = true;

export default definePlugin({
    name: "AllCallTimers",
    description: "Add call timer to all users in a server voice channel.",
    authors: [EquicordDevs.MaxHerbold, Devs.D3SOX],
    settings,
    patches: [
        {
            find: ".usernameSpeaking]",
            predicate: () => !settings.store.showWithoutHover,
            replacement: [
                {
                    match: /(?<=user:(\i).*?)iconGroup,.{0,200}children:\[/,
                    replace: "$&$self.renderTimer($1.id),"
                },
            ]
        },
        {
            find: ".usernameSpeaking]",
            predicate: () => settings.store.showWithoutHover,
            replacement: [
                {
                    match: /function\(\)\{.+:""(?=.*?userId:(\i))/,
                    replace: "$&,$self.renderTimer($1.id),"
                }
            ]
        }
    ],

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myId = UserStore.getCurrentUser().id;

            for (const state of voiceStates) {
                const { userId, channelId, guildId } = state;
                const isMe = userId === myId;

                if (!guildId) {
                    // guildId is never undefined here
                    continue;
                }

                // check if the state does not actually has a `oldChannelId` property
                if (!("oldChannelId" in state) && !runOneTime && !settings.store.watchLargeGuilds) {
                    // batch update triggered. This is ignored because it
                    // is caused by opening a previously unopened guild
                    continue;
                }

                let { oldChannelId } = state;
                if (isMe && channelId !== myLastChannelId) {
                    oldChannelId = myLastChannelId;
                    myLastChannelId = channelId;
                }

                if (channelId !== oldChannelId) {
                    if (channelId) {
                        // move or join
                        addUserJoinTime(userId, channelId, guildId);
                    } else if (oldChannelId) {
                        // leave
                        removeUserJoinTime(userId);
                    }
                }
            }
            runOneTime = false;
        },
        PASSIVE_UPDATE_V1(passiveUpdate: PassiveUpdateState) {
            if (settings.store.watchLargeGuilds) {
                return;
            }

            const { voiceStates } = passiveUpdate;
            if (!voiceStates) {
                // if there are no users in a voice call
                return;
            }

            // find all users that have the same guildId and if that user is not in the voiceStates, remove them from the map
            const { guildId } = passiveUpdate;

            // check the guildId in the userJoinTimes map
            for (const [userId, data] of userJoinTimes) {
                if (data.guildId === guildId) {
                    // check if the user is in the voiceStates
                    const userInVoiceStates = voiceStates.find(state => state.userId === userId);
                    if (!userInVoiceStates) {
                        // remove the user from the map
                        removeUserJoinTime(userId);
                    }
                }
            }

            // since we were gifted this data let's use it to update our join times
            for (const state of voiceStates) {
                const { userId, channelId } = state;

                if (!channelId) {
                    // channelId is never undefined here
                    continue;
                }

                // check if the user is in the map
                if (userJoinTimes.has(userId)) {
                    // check if the user is in a channel
                    if (channelId !== userJoinTimes.get(userId)?.channelId) {
                        // update the user's join time
                        addUserJoinTime(userId, channelId, guildId);
                    }
                } else {
                    // user wasn't previously tracked, add the user to the map
                    addUserJoinTime(userId, channelId, guildId);
                }
            }
        },
    },

    subscribeToAllGuilds() {
        // we need to subscribe to all guilds' events because otherwise we would miss updates on large guilds
        const guilds = Object.values(GuildStore.getGuilds()).map(guild => guild.id);
        const subscriptions = guilds.reduce((acc, id) => ({ ...acc, [id]: { typing: true } }), {});
        FluxDispatcher.dispatch({ type: "GUILD_SUBSCRIPTIONS_FLUSH", subscriptions });
    },

    start() {
        if (settings.store.watchLargeGuilds) {
            this.subscribeToAllGuilds();
        }
    },

    renderTimer(userId: string) {
        // get the user join time from the users object
        const joinTime = userJoinTimes.get(userId);
        if (!joinTime?.time) {
            // join time is unknown
            return;
        }
        if (userId === UserStore.getCurrentUser().id && !settings.store.trackSelf) {
            // don't show for self
            return;
        }

        return (
            <ErrorBoundary>
                <Timer time={joinTime.time} />
            </ErrorBoundary>
        );
    },
});
