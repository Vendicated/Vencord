/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, SelectedChannelStore, UserStore } from "@webpack/common";

const whosThere = {};
const whosThereReverse = {};
let originalVolumes = {};

// connection to game
// undefined if not connected or closed
// Websocket otherwise
let ws;
// bindWS() is called with a generation
// generation is incremented when a connection closes
// if the global generation != the generation bindWS() is ran with
// bindWS() quits recursively calling itself
// so there are only one bindWS() recursively calling itself at any given moment
let generation = 0;

const localVolumeSetter = findByPropsLazy("setLocalVolume");
const localVolumeGetter = findByPropsLazy("getLocalVolume");

// undo everything the plugin has done
function restore(): void {
    // resets user volume to how it was before starting the connection
    for (const [user, volume] of Object.entries(originalVolumes)) {
        localVolumeSetter.setLocalVolume(user, volume);
    }

    // clears this
    originalVolumes = {};

    // close any opened connections
    if (ws !== undefined) {
        ws.close();
        ws = undefined;
        generation++;
    }

    console.log("Restored user volumes");
}

// runs after connection opened
function connect(): void {
    // nothing here for now
}

function bindWS(localGen: number): void {
    const myId = UserStore.getCurrentUser().id;
    if (generation !== localGen) return;
    // no longer in VC
    if (whosThereReverse[myId] === undefined) return;

    try {
        ws = new WebSocket("ws://127.0.0.1:25560/api/subscription");
        ws.onopen = () => {
            console.log("Connected to proximity websocket.");
            connect();
            ws.send(JSON.stringify({
                t: "clear",
                c: 0
            }));

            const targets = Object.keys(whosThere[whosThereReverse[myId]]).filter(id => id !== myId);

            if (targets.length !== 0) {
                ws.send(JSON.stringify({
                    t: "sub",
                    c: targets
                }));
            }
        };

        let connected = false;

        ws.onmessage = ({ data }) => {
            data = JSON.parse(data);

            switch (data.t) {
                case "connected": {
                    connected = true;
                    break;
                }
                case "set": {
                    if (!connected) break;

                    const content: {
                        [key: string]: number;
                    } = data.c;

                    for (const [userId, multiplier] of Object.entries(content)) {
                        if (originalVolumes[userId] === undefined) {
                            originalVolumes[userId] = localVolumeGetter.getLocalVolume(userId);
                        }

                        localVolumeSetter.setLocalVolume(userId, originalVolumes[userId] * multiplier);
                    }
                }

            }
        };

        // retry in 10 seconds
        ws.onclose = ws.onerror = () => {
            if (generation !== localGen) {
                ws = undefined;
                restore();
                setTimeout(() => bindWS(localGen), 10000);
            }
        };
    } catch (e) {
        ws = undefined;
        setTimeout(() => bindWS(localGen), 10000);
    }
}

// skidded from the TTS vc join announcer thing
interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
}

export default definePlugin({
    name: "DiscordProximity",
    description: "Proximity voice chat plugin for Discord.",
    authors: [Devs.Siriusmart],

    start: () => {
        generation++;
        bindWS(generation);
    },

    stop: () => {
        generation++;
        restore();
    },

    // dunno what this does, stolen from another plugin
    // but it works, thats all that matters
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myId = UserStore.getCurrentUser().id;
            const myChanId = SelectedChannelStore.getVoiceChannelId();

            if (ChannelStore.getChannel(myChanId!)?.type === 13 /* Stage Channel */) return;

            // dunno why this loop is requried
            // again i just copied their code
            for (const state of voiceStates) {
                // state is any changes in VC states
                if (state.channelId == null) {
                    // this means someone has left the VC
                    try {
                        // if the volume of this user has been modified, reset it to its original volume
                        if (originalVolumes[state.userId] !== undefined) {
                            localVolumeSetter.setLocalVolume(state.userId, originalVolumes[state.userId]);
                        }

                        delete whosThereReverse[state.userId];

                        if (ws !== undefined && myChanId === state.oldChannelId && state.userId !== myId) {
                            ws.send(JSON.stringify({ t: "unsub", c: [state.userId] }));
                        }

                        // remove user from the vc he left
                        if (state.oldChannelId != null) {
                            delete whosThere[state.oldChannelId][state.userId];
                            if (Object.keys(whosThere[state.oldChannelId]).length === 0) {
                                delete whosThere[state.oldChannelId];
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }

                    if (ws !== undefined && myChanId === state.oldChannelId && state.userId !== myId) {
                        ws.send(JSON.stringify({ t: "unsub", c: [state.userId] }));
                    }

                    // if you left the vc, close the connection and restore everything
                    if (state.userId === myId) {
                        if (ws !== undefined) {
                            ws.close();
                            ws = undefined;
                        }

                        generation++;

                        restore();
                    }
                } else {
                    // if the user only moved channels
                    // then remove him from his old channel
                    if (state.oldChannelId != null && state.oldChannelId !== state.channelId) {
                        try {
                            delete whosThereReverse[state.userId];
                            delete whosThere[state.oldChannelId][state.userId];

                            if (ws !== undefined && myChanId === state.oldChannelId && state.userId !== myId) {
                                ws.send(JSON.stringify({ t: "unsub", c: [state.userId] }));
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    whosThereReverse[state.userId] = state.channelId;
                    whosThere[state.channelId] ??= {};
                    whosThere[state.channelId][state.userId] = true;

                    if (ws !== undefined && myChanId === state.channelId && state.userId !== myId) {
                        ws.send(JSON.stringify({ t: "sub", c: [state.userId] }));
                    }

                    // if you joined a vc, start the connection
                    if (ws === undefined && state.userId === myId) {
                        generation++;
                        bindWS(generation);
                    }
                }
            }
        }
    }
});
