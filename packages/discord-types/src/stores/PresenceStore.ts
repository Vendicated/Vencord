/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { Activity } from "../general/Activity";

export declare class PresenceStore extends Store {
    static displayName: "PresenceStore";

    findActivity<T extends Activity>(
        userId: string,
        predicate: (
            value: Activity,
            index: number,
            array: Activity[]
        ) => value is T,
        guildId?: string | null /* = null */
    ): T | undefined;
    findActivity(
        userId: string,
        predicate: (
            value: Activity,
            index: number,
            array: Activity[]
        ) => unknown,
        guildId?: string | null /* = null */
    ): Activity | undefined;
    getActivities(userId: string, guildId?: string | null /* = null */): Activity[];
    getActivityMetadata(userId: string): Record<string, unknown> | undefined;
    getAllApplicationActivities(applicationId?: Activity["application_id"]): {
        activity: Activity;
        userId: string;
    }[];
    getApplicationActivity(
        userId: string,
        applicationId?: Activity["application_id"],
        guildId?: string | null /* = null */
    ): Activity | undefined;
    getClientStatus(userId: string): ClientStatusMap | undefined;
    getPrimaryActivity(userId: string, guildId?: string | null /* = null */): Activity | undefined;
    getState(): {
        activities: { [userId: string]: Activity[]; };
        activityMetadata: { [userId: string]: Record<string, unknown>; };
        clientStatuses: { [userId: string]: ClientStatusMap; };
        lastOnlineTimestamps: { [userId: string]: number; };
        presencesForGuilds: { [userId: string]: { [guildId: string]: GuildPresence; }; };
        statuses: { [userId: string]: StatusType; };
    };
    getStatus(
        userId: string,
        guildId?: string | null /* = null */,
        defaultStatus?: StatusType /* = StatusType.OFFLINE */
    ): StatusType;
    getUserIds(): string[];
    initialize(): void;
    isMobileOnline(userId: string): boolean;
    setCurrentUserOnConnectionOpen(status: StatusType, activities: Activity[]): void;
}

export type ClientStatusMap = Partial<Record<ClientType, StatusType>>;

// Original name: ClientTypes
export enum ClientType {
    DESKTOP = "desktop",
    EMBEDDED = "embedded", // Undocumented
    MOBILE = "mobile",
    UNKNOWN = "unknown",
    WEB = "web",
}

// Original name: StatusTypes
export enum StatusType {
    DND = "dnd",
    IDLE = "idle",
    INVISIBLE = "invisible",
    OFFLINE = "offline",
    ONLINE = "online",
    STREAMING = "streaming",
    UNKNOWN = "unknown",
}

export interface GuildPresence {
    activities: Activity[];
    clientStatus: ClientStatusMap;
    status: StatusType;
    timestamp: number;
}
