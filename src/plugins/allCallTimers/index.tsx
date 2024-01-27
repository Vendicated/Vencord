/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";
import { VoiceState } from "@webpack/types";

import { Timer } from "./Timer";

export const settings = definePluginSettings({
    alwaysShow: {
        type: OptionType.BOOLEAN,
        description: "Always show the timer or have it as a tooltip icon",
        restartNeeded: false,
        default: false
    },
    trackSelf: {
        type: OptionType.BOOLEAN,
        description: "Also track for yourself",
        restartNeeded: true,
        default: false
    },
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
        VOICE_STATE_UPDATES({ voiceStates }: {voiceStates: VoiceState[];}) {
            const myId = UserStore.getCurrentUser().id;

            for (const state of voiceStates) {
                const { userId, channelId } = state;
                const isMe = userId === myId;
                if (!settings.store.trackSelf && isMe) {
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
                        userJoinTimes.set(userId, Date.now());
                    } else if (oldChannelId) {
                        // leave
                        userJoinTimes.delete(userId);
                    }
                }
            }
        },
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

        return (
            <ErrorBoundary>
                <Timer time={joinTime} />
            </ErrorBoundary>
        );
    },
});
