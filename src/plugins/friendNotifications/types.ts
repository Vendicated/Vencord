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

import { Channel, User } from "discord-types/general";

export type Status = "online" | "idle" | "dnd" | "offline";
export type Platform = "web" | "mobile" | "desktop";
export type NotificationAction = "open" | "profile" | "dismiss";

export type UserContextProps = {
    channel: Channel;
    guildId?: string;
    user: User;
};

export type FriendNotificationStore = Set<string>;
export type FriendNotificationStatusStore = Map<string, Activity>;

export type Activity = {
    created_at: string;
    id: "custom" | string;
    name: "Custom Status" | string;
    state: string; // The custom status
    timestamps: {
        end: string; // Unix time of when status expires
    };
    type: number; // 4???
};

export type Update = {
    user: User;
    status: Status;
    guildId: string;
    activities: Activity[];
};

export type PresenceStoreState = {
    activities: Record<string, Activity[]>,
    clientStatuses: Record<string, Record<Platform, Status>>;
};
