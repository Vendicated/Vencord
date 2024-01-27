/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useTimer } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Tooltip } from "@webpack/common";


const VoiceStateStore = findStoreLazy("VoiceStateStore");


export const settings = definePluginSettings({
    alwaysShow: {
        type: OptionType.BOOLEAN,
        description: "Always show the timer or have it as a tooltip icon",
        restartNeeded: false,
        default: false
    },
});


export default definePlugin({
    name: "AllCallTimers",
    description: "Add call timer to all users in a server voice channel.",
    authors: [Devs.Max],

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
        const states = VoiceStateStore.getAllVoiceStates();

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

        if (VoiceStateStore == null) {
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

        if (settings.store.alwaysShow) {
            return <p style={{
                margin: 0, fontWeight: "bold", letterSpacing: -2, fontFamily: "monospace", fontSize: 12, color: "red", position: "absolute", bottom: 0, right: 0, padding: 2, background: "rgba(0,0,0,.5)", borderRadius: 3
            }
            } > {formatted}</p >;
        } else {
            // show as a tooltip
            const icon = <svg className="icon__1d60c" height="10" width="10" viewBox="0 0 455 455" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" xmlSpace="preserve">
                <path fill="currentColor" d="M332.229,90.04l14.238-27.159l-26.57-13.93L305.67,76.087c-19.618-8.465-40.875-13.849-63.17-15.523V30h48.269V0H164.231v30
        H212.5v30.563c-22.295,1.674-43.553,7.059-63.171,15.523L135.103,48.95l-26.57,13.93l14.239,27.16
        C67.055,124.958,30,186.897,30,257.5C30,366.576,118.424,455,227.5,455S425,366.576,425,257.5
        C425,186.896,387.944,124.958,332.229,90.04z M355,272.5H212.5V130h30v112.5H355V272.5z"/>
            </svg>;

            return (
                <Tooltip text={formatted}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                        >
                            {icon}
                        </div>
                    )}
                </Tooltip>
            );
        }
    }
});
