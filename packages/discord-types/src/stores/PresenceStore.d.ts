/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { FluxStore } from "./abstract/FluxStore";

export type PresenceStoreAction = ExtractAction<FluxAction, "ACTIVITY_METADATA_UPDATE" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_MEMBER_REMOVE" | "OVERLAY_INITIALIZE" | "PRESENCES_REPLACE" | "PRESENCE_UPDATES" | "SELF_PRESENCE_STORE_UPDATE" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_LIST_UPDATE">;

// Does not extend PersistedStore.
export class PresenceStore<Action extends FluxAction = PresenceStoreAction> extends FluxStore<Action> {
    static displayName: "PresenceStore";

    findActivity(e?: any, t?: any): any; // TEMP
    getActivities(e?: any): any; // TEMP
    getActivityMetadata(e?: any): any; // TEMP
    getAllApplicationActivities(e?: any): any; // TEMP
    getApplicationActivity(e?: any, t?: any): any; // TEMP
    getClientStatus(userId: string): Partial<Record<ClientType, StatusType>> | undefined;
    getLastOnlineTimestamp(userId: string): number | undefined;
    getPrimaryActivity(e?: any): any; // TEMP
    getState(): {
        activities: any; // TEMP
        activityMetadata: any; // TEMP
        clientStatuses: any; // TEMP
        lastOnlineTimestamps: any; // TEMP
        presencesForGuilds: any; // TEMP
        statuses: any; // TEMP
    }; // TEMP
    getStatus(e?: any): any; // TEMP
    getUserIds(): string[];
    isMobileOnline(userId: string): boolean;
    setCurrentUserOnConnectionOpen(e?: any, t?: any): any; // TEMP
}

/** @todo Might have more properties. */
export interface Activity {
    application_id: any; // TEMP
    assets: any; // TEMP
    buttons: any; // TEMP
    created_at: any; // TEMP
    details: any; // TEMP
    emoji: any; // TEMP
    flags: any; // TEMP
    id: any; // TEMP
    name: any; // TEMP
    party: any; // TEMP
    platform: any; // TEMP
    session_id: any; // TEMP
    state: any; // TEMP
    supported_platforms: any; // TEMP
    sync_id: any; // TEMP
    timestamps: any; // TEMP
    type: any; // TEMP
    url: any; // TEMP
}

// Original name: ClientTypes
export const enum ClientType {
    DESKTOP = "desktop",
    MOBILE = "mobile",
    UNKNOWN = "unknown",
    WEB = "web",
}

// Original name: StatusTypes
export const enum StatusType {
    DND = "dnd",
    IDLE = "idle",
    INVISIBLE = "invisible",
    OFFLINE = "offline",
    ONLINE = "online",
    STREAMING = "streaming",
    UNKNOWN = "unknown",
}
