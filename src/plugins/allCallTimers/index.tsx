import definePlugin from "@utils/types";
import { findStore } from "@webpack";
import { React } from "@webpack/common";
import ErrorBoundary from "@components/ErrorBoundary";
import { useTimer } from "@utils/react";



export default definePlugin({
    name: "AllCallTimeCounter",
    description: "Add call timer to all users in a server voice channel.",
    authors: [
        {
            id: 0n,
            name: "Max",
        },
    ],
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

    allUsers(guilds) {
        // return an array of all users in all guilds
        let users: string[] = [];
        for (let guildId in guilds) {
            let guild = guilds[guildId];
            for (let userId in guild) {
                users.push(userId);
            }
        }
        return users;
    },

    update_listings() {
        const states = this.VoiceStateStore.getAllVoiceStates();

        let current_users = this.allUsers(states);
        for (let userId in this.users) {
            if (!current_users.includes(userId)) {
                delete this.users[userId];
            }
        }

        // states is an array of {guildId: {userId: {channelId: channelId}}}
        // iterate through all guilds and update the users, check if the user is in the same channel as before
        // if userId is not in any guild it should be deleted from the users object
        for (let guildId in states) {
            let guild = states[guildId];
            for (let userId in guild) {
                let user = guild[userId];
                let { channelId } = user;
                if (channelId) {
                    if (this.users[userId]) {
                        // user is already in the users object
                        if (this.users[userId]["channelId"] !== channelId) {
                            // user changed the channel
                            this.users[userId]["channelId"] = channelId;
                            this.users[userId]["join_time"] = Date.now();
                        }
                    } else {
                        // user is not in the users object
                        this.users[userId] = {
                            "channelId": channelId,
                            "join_time": Date.now()
                        };
                    }
                }
            }
        }
    },

    start() {
        this.VoiceStateStore = findStore("VoiceStateStore");

        this.users = {};

        // start a timeout that runs every second and calls update_listings
        this.timeout = setInterval(() => this.update_listings(), 1000);
    },

    stop() {
        // clear the timeout
        clearInterval(this.timeout);
    },

    showInjection(property) {
        const userId = property.props.user.id;

        if (this.VoiceStateStore == null) {
            console.log("VoiceStateStore is null");
            return;
        }

        return this.renderTimer(userId);
    },

    renderTimer(userId: string) {
        // get the user from the users object
        let user = this.users[userId];
        if (!user) {
            return;
        }
        let start_time = user["join_time"];
        return <ErrorBoundary>
            <this.Timer time={start_time} />
        </ErrorBoundary>;
    },

    Timer({ time }: { time: number; }) {
        const timer = useTimer({});
        const start_time = time;

        const formatted = new Date(Date.now() - start_time).toISOString().substr(11, 8);

        return <p style={{
            margin: 0, fontWeight: "bold", letterSpacing: -2, fontFamily: "monospace", fontSize: 12, color: "red", position: "absolute", bottom: 0, right: 0, padding: 2, background: "rgba(0,0,0,.5)", borderRadius: 3
        }
        } > {formatted}</p >;
    }
});