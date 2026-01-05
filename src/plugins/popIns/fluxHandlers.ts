import { UserStore } from "@webpack/common";

import { closeVideoPopIn, closeAllWindows, setCurrentChannelId } from "./components/FloatingWindow";
import { getStreamKey } from "./constants";
import { Stream, VoiceStateChangeEvent } from "./types";
import { parseStreamKey } from "./utils/parseStreamKey";

/**
 * Handle VOICE_STATE_UPDATES flux event.
 * Tracks current channel and closes popouts when user leaves/moves channels.
 */
export function handleVoiceStateUpdates({ voiceStates }: { voiceStates: VoiceStateChangeEvent[]; }): void {
    const myId = UserStore.getCurrentUser()?.id;
    if (!myId) return;

    for (const state of voiceStates) {
        if (state.userId !== myId) continue;

        const { channelId, oldChannelId } = state;

        // User joined/moved to a channel
        if (channelId) {
            setCurrentChannelId(channelId);
        }

        // User left a channel - close all popouts
        if (!channelId && oldChannelId) {
            setCurrentChannelId(null);
            closeAllWindows();
        }

        // User moved channels - close popouts from old channel
        if (channelId && oldChannelId && channelId !== oldChannelId) {
            closeAllWindows();
        }
    }
}

/**
 * Handle STREAM_DELETE flux event.
 * Closes popout when the stream ends.
 */
export function handleStreamDelete(event: { streamKey: string; }): void {
    const stream = parseStreamKey(event.streamKey);
    if (!stream) return;
    closeVideoPopIn(getStreamKey(stream as Stream), stream.ownerId);
}
