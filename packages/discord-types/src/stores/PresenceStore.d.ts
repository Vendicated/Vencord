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
    getClientStatus(e?: any): any; // TEMP
    getLastOnlineTimestamp(e?: any): any; // TEMP
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
    getUserIds(): any; // TEMP
    isMobileOnline(e?: any): any; // TEMP
    setCurrentUserOnConnectionOpen(e?: any, t?: any): any; // TEMP
}
