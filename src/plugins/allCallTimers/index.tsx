/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useTimer } from "@utils/react";
import definePlugin from "@utils/types";
import { findStore } from "@webpack";
import { React } from "@webpack/common";


export default definePlugin({
    name: "AllCallTimers",
    description: "Add call timer to all users in a server voice channel.",
    authors: [Devs.Max],

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

    allUsers(guilds: Record<string, any>) {
        // return an array of all users in all guilds
        const users: string[] = [];
        for (const guildId in guilds) {
            const guild = guilds[guildId];
            for (const userId in guild) {
                users.push(userId);
            }
        }
        return users;
    },

    updateListings() {
        const states = this.VoiceStateStore.getAllVoiceStates();

        const currentUsers = this.allUsers(states);
        for (const userId in this.users) {
            if (!currentUsers.includes(userId)) {
                delete this.users[userId];
            }
        }

        // states is an array of {guildId: {userId: {channelId: channelId}}}
        // iterate through all guilds and update the users, check if the user is in the same channel as before
        // if userId is not in any guild it should be deleted from the users object
        for (const guildId in states) {
            const guild = states[guildId];
            for (const userId in guild) {
                const { channelId } = guild[userId];
                if (!channelId) {
                    return;
                }
                if (this.users[userId]) {
                    // user is already in the users object
                    if (this.users[userId].channelId !== channelId) {
                        // user changed the channel
                        this.users[userId].channelId = channelId;
                        this.users[userId].joinTime = Date.now();
                    }
                } else {
                    // user is not in the users object
                    this.users[userId] = {
                        channelId: channelId,
                        joinTime: Date.now()
                    };
                }
            }
        }
    },

    start() {
        this.VoiceStateStore = findStore("VoiceStateStore");

        this.users = {};

        // start a timeout that runs every second and calls updateListings
        this.timeout = setInterval(() => this.updateListings(), 1000);
    },

    stop() {
        // clear the timeout
        clearInterval(this.timeout);
    },

    showInjection(property: { props: { user: { id: string; }; }; }) {
        const userId = property.props.user.id;

        if (this.VoiceStateStore == null) {
            console.log("VoiceStateStore is null");
            return;
        }

        return this.renderTimer(userId);
    },

    renderTimer(userId: string) {
        // get the user from the users object
        const user = this.users[userId];
        if (!user) {
            return;
        }
        const startTime = user.joinTime;
        return <ErrorBoundary>
            <this.Timer time={startTime} />
        </ErrorBoundary>;
    },

    Timer({ time }: { time: number; }) {
        const timer = useTimer({});
        const startTime = time;

        const formatted = new Date(Date.now() - startTime).toISOString().substr(11, 8);

        return <p style={{
            margin: 0, fontWeight: "bold", letterSpacing: -2, fontFamily: "monospace", fontSize: 12, color: "red", position: "absolute", bottom: 0, right: 0, padding: 2, background: "rgba(0,0,0,.5)", borderRadius: 3
        }
        } > {formatted}</p >;
    }
});
