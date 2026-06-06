/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { MediaEngineStore,SelectedChannelStore, UserStore, VoiceStateStore } from "@webpack/common";

// lot of code here is common with vcNarrator; the VoiceStateChangeEvent parsing is nearly identical

interface VoiceStateChangeEvent {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    sessionId: string;
}

interface Pan {
    left?: number;
    right?: number;
}

function getTypeAndChannelId({ channelId, oldChannelId }: VoiceStateChangeEvent) {
    if (channelId !== oldChannelId) {
        if (channelId) return [oldChannelId ? "move" : "join", channelId];
        if (oldChannelId) return ["leave", oldChannelId];
    }
    return ["", ""];
}

const { setLocalPan } = findByPropsLazy("setLocalPan", "setLocalVolume");
// signature of setLocalPan (userId: string, left: number, right: number)

// not 100% sure if i will ever need getLocalPan but it's useful to have the module here as it also holds some other misc voice state mutating functions
const { getLocalPan } = findByPropsLazy("getLocalPan", "getLocalVolume");
// signature of getLocalPan (userId: string) -> Pan

// START shameless LLM use
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // keep it 32-bit unsigned
    }
    return hash;
}

function panFromString(str: string): Pan {
    const hash = hashString(str);
    const pan = (hash % 1000) / 1000; // 0.0 – 0.999

    // Model A: attenuate the opposite side
    return pan < 0.5
        ? { left: 1.0, right: pan * 2 } // panned left
        : { left: (1 - pan) * 2, right: 1.0 }; // panned right
}
// END shameless LLM use

var hasToasted = false;

function handleUserPan(userId: string): undefined {
    const userPan = panFromString(userId);
    setLocalPan(userId, userPan.left, userPan.right);

    const currentMediaEngine = MediaEngineStore.getMediaEngine();
    const canPan = currentMediaEngine.supports("VOICE_PANNING");
    if (!canPan && !hasToasted) {
        showNotification({
            title: "DeterministicUserPanning",
            body: "This media engine doesn't support panning! User voices will not pan.",
        });
        hasToasted = true;
    }
}

export default definePlugin({
    name: "DeterministicUserPanning",
    description: "Pans users audio in voice chats to establish a simple soundstage",
    authors: [Devs.regulad],
    // TODO: patch to get panning working again
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceStateChangeEvent[]; }) {
            const myChanId = SelectedChannelStore.getVoiceChannelId();
            const myId = UserStore.getCurrentUser().id;

            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isMe = userId === myId;
                if (!isMe) {
                    if (!myChanId) continue;
                    if (channelId !== myChanId && oldChannelId !== myChanId) continue;
                }

                if (isMe && !!channelId) {
                    // we left/joined a channel, we need to handle all users in our new channel
                    const allStates = VoiceStateStore.getVoiceStatesForChannel(channelId);
                    for (const oneState of Object.values(allStates)) {
                        handleUserPan(oneState.userId);
                    }
                    continue;
                }

                const [type, id] = getTypeAndChannelId(state);
                if (!type || type === "leave") continue;

                handleUserPan(userId);
            }
        },
    }
});
