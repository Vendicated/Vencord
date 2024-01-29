/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, GuildStore, UserStore } from "@webpack/common";
import { PassiveUpdateState, VoiceState } from "@webpack/types";

import { Timer } from "./Timer";

export const settings = definePluginSettings({
    showWithoutHover: {
        type: OptionType.BOOLEAN,
        description: "Always show the timer without needing to hover (not as pretty)!",
        restartNeeded: false,
        default: false
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
        description: "The timer format",
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

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

// Allow user updates on discord first load
let runOneTime = true;

export default definePlugin({
    name: "AllCallTimers",
    description: "Add call timer to all users in a server voice channel.",
    authors: [Devs.Max, Devs.D3SOX],

    settings,

    patches: [
        {
            find: "renderPrioritySpeaker",
            replacement: [
                {
                    match: /(render\(\)\{.+\}\),children:)\[(.+renderName\(\),)/,
                    replace: "$&$self.showInjection(this),"
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
                        userJoinTimes.set(userId, { channelId, time: Date.now(), guildId: guildId });
                    } else if (oldChannelId) {
                        // leave
                        userJoinTimes.delete(userId);
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
                        userJoinTimes.delete(userId);
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
                        userJoinTimes.set(userId, { channelId, time: Date.now(), guildId: passiveUpdate.guildId });
                    }
                } else {
                    // user wasn't previously tracked, add the user to the map
                    userJoinTimes.set(userId, { channelId, time: Date.now(), guildId: passiveUpdate.guildId });
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

    showInjection(property: { props: { user: { id: string; }; }; }) {
        const userId = property.props.user.id;
        return this.renderTimer(userId);
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
