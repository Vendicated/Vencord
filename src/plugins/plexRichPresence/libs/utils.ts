/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher } from "@webpack/common";

import { Activity } from "../types/default";

export function replaceAll(text: string, replaces: Record<string, string | number>) {
    return Object.entries(replaces).reduce((acc, [key, value]) => acc.replace(key, String(value)), text);
}

export function millisecondsToMinutes(milliseconds: number): string {
    const seconds: number = Math.floor(milliseconds / 1000);
    const minutes: number = Math.floor(seconds / 60);
    const remainingSeconds: number = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "PlexRPC",
    });
}
