/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type PresenceStatus = "online" | "idle" | "dnd" | "offline" | "invisible";

/**
 * Persistent frequency data stored per user in DataStore.
 * Field names are intentionally abbreviated to reduce storage footprint.
 * Do NOT rename these fields without a migration step — existing entries
 * in users' DataStore will silently lose their data.
 */
export interface FrequencyData {
    /** dm score — exponentially-decayed sum of DM interaction points */
    ds: number;
    /** voice score — exponentially-decayed sum of voice co-presence points */
    vs: number;
    /** dm last — timestamp (ms) of the last recorded DM interaction */
    dl: number;
    /** voice last — timestamp (ms) of the last recorded voice interaction */
    vl: number;
    /** affinity seed — initial score contribution seeded from Discord's affinity store */
    af: number;
}
