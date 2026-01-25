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

import { settings } from "./settings";

export function setUserTimezone(userId: string, tz: string) {
    const store = { ...settings.store.timezonesByUser } as Record<string, string>;
    if (!tz) {
        delete store[userId];
    } else {
        store[userId] = tz;
    }
    // @ts-ignore
    settings.store.timezonesByUser = store;
}

export function update(tz: string): Date {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(now);

    const values: Record<string, number> = {};
    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = Number(part.value);
        }
    }

    const targetTime = new Date(
        values.year ?? now.getFullYear(),
        (values.month ?? now.getMonth() + 1) - 1,
        values.day ?? now.getDate(),
        values.hour ?? 0,
        values.minute ?? 0,
        values.second ?? 0
    );

    const offsetMs = targetTime.getTime() - now.getTime();
    return new Date(now.getTime() + offsetMs);
}

export function getUserTimezone(userId: string): string {
    return (settings.store.timezonesByUser as unknown as Record<string, string>)[userId] ?? "";
}

export function getOffsetMinutes(tz: string, when = new Date()): number {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }).formatToParts(when);

        const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
        const year = parseInt(map.year || "0", 10);
        const month = parseInt(map.month || "1", 10);
        const day = parseInt(map.day || "1", 10);
        const hour = parseInt(map.hour || "0", 10);
        const minute = parseInt(map.minute || "0", 10);
        const second = parseInt(map.second || "0", 10);

        const utcForLocal = Date.UTC(year, month - 1, day, hour, minute, second);
        const diffMs = utcForLocal - when.getTime();
        return Math.round(diffMs / 60000);
    } catch (e) {
        return 0;
    }
}

export function offsetLabelFromMinutes(minutes: number) {
    const sign = minutes >= 0 ? "+" : "-";
    const abs = Math.abs(minutes);
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    return `GMT${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

export function formatTimezoneLabel(tz: string, when = new Date()) {
    if (!tz) return "None";
    try {
        const offset = getOffsetMinutes(tz, when);
        const offLabel = offsetLabelFromMinutes(offset);
        return `(${offLabel}) ${tz.replace(/_/g, " ")}`;
    } catch {
        return tz.replace(/_/g, " ");
    }
}
