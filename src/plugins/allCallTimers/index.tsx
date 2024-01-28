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
import { VoiceState } from "@webpack/types";

import { Timer } from "./Timer";

export const settings = definePluginSettings({
    showWithoutHover: {
        type: OptionType.BOOLEAN,
        description: "Always show the timer without hover (not as pretty)!",
        restartNeeded: false,
        default: false
    },
    trackSelf: {
        type: OptionType.BOOLEAN,
        description: "Also track for yourself",
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
    }
});

// Save the join time of all users in a Map
const userJoinTimes = new Map<string, number>();

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

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
                const { userId, channelId } = state;
                const isMe = userId === myId;

                let { oldChannelId } = state;
                if (isMe && channelId !== myLastChannelId) {
                    oldChannelId = myLastChannelId;
                    myLastChannelId = channelId;
                }

                if (channelId !== oldChannelId) {
                    if (channelId) {
                        // move or join
                        userJoinTimes.set(userId, Date.now());
                    } else if (oldChannelId) {
                        // leave
                        userJoinTimes.delete(userId);
                    }
                }
            }
        },
    },

    start() {
        // we need to subscribe to all guilds' events because otherwise we would miss updates on large guilds
        const guilds = Object.values(GuildStore.getGuilds()).map(guild => guild.id);
        const subscriptions = guilds.reduce((acc, id) => ({ ...acc, [id]: { typing: true } }), {});
        FluxDispatcher.dispatch({ type: "GUILD_SUBSCRIPTIONS_FLUSH", subscriptions });
    },

    showInjection(property: { props: { user: { id: string; }; }; }) {
        const userId = property.props.user.id;
        return this.renderTimer(userId);
    },

    renderTimer(userId: string) {
        // get the user join time from the users object
        const joinTime = userJoinTimes.get(userId);
        if (!joinTime) {
            // join time is unknown
            return;
        }
        if (userId === UserStore.getCurrentUser().id && !settings.store.trackSelf) {
            // don't show for self
            return;
        }

        return (
            <ErrorBoundary>
                <Timer time={joinTime} />
            </ErrorBoundary>
        );
    },
});
