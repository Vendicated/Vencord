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

// Stream data from Discord
export interface Stream {
    streamType: string;
    guildId: string | null;
    channelId: string;
    ownerId: string;
}

// Voice state change event from Flux
export interface VoiceStateChangeEvent {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
}

// Discord's ApplicationStreamingStore interface
export interface ApplicationStreamingStore {
    getAllActiveStreamsForChannel: (channelId: string) => Stream[];
    getAnyStreamForUser: (userId: string) => Stream | null;
}

// Discord's ApplicationStreamPreviewStore interface
export interface ApplicationStreamPreviewStore {
    getPreviewURL: (guildId: string | null, channelId: string, ownerId: string) => Promise<string | null>;
}

// Discord's WindowStore extended interface
export interface ExtendedWindowStore {
    addChangeListener: (handler: () => void) => void;
    removeChangeListener: (handler: () => void) => void;
    getWindowKeys: () => string[];
    getWindow: (key: string) => Window | null;
}

// Context menu props for stream context
export interface StreamContextProps {
    stream: Stream;
}

// Context menu props for user context
export interface UserContextProps {
    user: { id: string; };
}
