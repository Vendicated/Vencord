/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { UserStore } from "@webpack/common";

import { logger } from "./constants";
import { closeAllWindows, closeStreamWindow, setCurrentChannelId } from "./components/FloatingWindow";
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
            logger.info(`Left channel ${oldChannelId}, closing popouts`);
            setCurrentChannelId(null);
            closeAllWindows();
        }

        // User moved channels - close popouts from old channel
        if (channelId && oldChannelId && channelId !== oldChannelId) {
            logger.info(`Moved channels, closing old popouts`);
            closeAllWindows();
        }
    }
}

/**
 * Handle STREAM_DELETE flux event.
 * Closes popout when the stream ends.
 */
export function handleStreamDelete(event: { streamKey: string; }): void {
    logger.info("STREAM_DELETE event:", event.streamKey);
    const stream = parseStreamKey(event.streamKey);
    if (!stream) return;
    closeStreamWindow(stream as Stream);
}
