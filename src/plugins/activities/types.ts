/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

export interface ActivityProps {
    className: string;
    textClassName: string;
    emojiClassName: string;
    activities: Activity[];
    applicationStream: null;
    animate: boolean;
    hideEmoji: boolean;
    hideTooltip: boolean;
}

export interface Activity {
    created_at: string;
    id: string;
    name: string;
    state?: string;
    type: ActivityType;
    assets?: Assets;
    flags?: number;
    platform?: string;
    timestamps?: Timestamps;
    details?: string;
    party?: Party;
    session_id?: string;
    sync_id?: string;
}

export enum ActivityType {
    Playing = 0,
    Streaming = 1,
    Listening = 2,
    Watching = 3,
    CustomStatus = 4,
    Competing = 5,
}

export interface Assets {
    small_image?: string;
    large_image?: string;
    large_text?: string;
}

export interface Party {
    id: string;
}

export interface Timestamps {
    start: string;
    end?: string;
}
