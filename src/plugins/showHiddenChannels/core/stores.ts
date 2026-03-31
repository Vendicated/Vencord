/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { findStoreLazy } from "@webpack";

export interface StreamLike {
    channelId?: string | null;
    ownerId?: string | null;
    guildId?: string | null;
}

export interface VoiceStateLike {
    channelId?: string | null;
    userId?: string | null;
    selfStream?: boolean;
    selfVideo?: boolean;
}

interface ApplicationStreamingState {
    activeStreams?: Array<[string, StreamLike]>;
    streamsByUserAndGuild?: Record<string, Record<string, StreamLike>>;
}

export const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore") as {
    getState?: () => ApplicationStreamingState;
    getAllActiveStreams?: () => unknown[];
    getAllApplicationStreams?: () => unknown[];
    getAnyDiscoverableStreamForUser?: (userId: string | bigint) => unknown | null;
    getAnyStreamForUser?: (userId: string | bigint) => unknown | null;
    getAllActiveStreamsForChannel?: (channelId: string | bigint) => unknown[];
    getAllApplicationStreamsForChannel?: (channelId: string | bigint) => unknown[];
};

export const ChannelRTCStore = findStoreLazy("ChannelRTCStore") as {
    getParticipant?: (channelId: string | bigint, participantId: string) => unknown | null;
    getParticipants?: (channelId: string | bigint) => unknown[];
    getFilteredParticipants?: (channelId: string | bigint) => unknown[];
    getSpeakingParticipants?: (channelId: string | bigint) => unknown[];
    getSelectedParticipant?: (channelId: string | bigint) => unknown | null;
    getStreamParticipants?: (channelId: string | bigint) => unknown[];
};

export const VoiceStateStore = findStoreLazy("VoiceStateStore") as {
    getAllVoiceStates?: () => Record<string, VoiceStateLike>;
    getVoiceStates?: (guildId?: string | null) => Record<string, VoiceStateLike>;
    getVoiceStatesForChannel?: (channelId: string | bigint) => Record<string, VoiceStateLike>;
    getDiscoverableVoiceState?: (guildId: string | null, userId: string | bigint) => unknown | null;
    getVoiceState?: (guildId: string | null, userId: string | bigint) => unknown | null;
    getVoiceStateForChannel?: (channelId: string | bigint, userId?: string | bigint) => unknown | null;
    getDiscoverableVoiceStateForUser?: (userId: string | bigint) => unknown | null;
    getVoiceStateForUser?: (userId: string | bigint) => unknown | null;
};
