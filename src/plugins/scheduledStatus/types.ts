/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type StatusType = "online" | "idle" | "dnd" | "invisible";
export type DefaultStatusType = "previous" | "keep" | StatusType;

export interface ScheduleRule {
    id: string;
    name: string;
    enabled: boolean;
    days: number[];
    startTime: string;
    endTime: string;
    status: StatusType;
}

export const DAYS = [
    { short: "Mon", long: "Monday", value: 0 },
    { short: "Tue", long: "Tuesday", value: 1 },
    { short: "Wed", long: "Wednesday", value: 2 },
    { short: "Thu", long: "Thursday", value: 3 },
    { short: "Fri", long: "Friday", value: 4 },
    { short: "Sat", long: "Saturday", value: 5 },
    { short: "Sun", long: "Sunday", value: 6 },
] as const;

export const DAY_NAMES: Record<number, string> = {
    0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
    4: "Friday", 5: "Saturday", 6: "Sunday",
};

export const STATUS_OPTIONS = [
    { label: "Online", value: "online" as StatusType },
    { label: "Idle", value: "idle" as StatusType },
    { label: "Do Not Disturb", value: "dnd" as StatusType },
    { label: "Invisible", value: "invisible" as StatusType },
];

export const DEFAULT_STATUS_OPTIONS = [
    { label: "Restore Previous", value: "previous" as DefaultStatusType },
    { label: "Keep Current", value: "keep" as DefaultStatusType },
    ...STATUS_OPTIONS,
];

function timeToMinutes(t: string) {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

function jsToDay(jsDay: number) {
    return (jsDay + 6) % 7;
}

function getRuleIntervals(rule: ScheduleRule) {
    const intervals: { day: number; start: number; end: number; }[] = [];
    if (!rule.days.length) return intervals;

    const start = timeToMinutes(rule.startTime);
    const end = timeToMinutes(rule.endTime);

    for (const d of rule.days) {
        if (start < end) {
            intervals.push({ day: d, start, end });
        } else if (start > end) {
            intervals.push({ day: d, start, end: 1440 });
            intervals.push({ day: (d + 1) % 7, start: 0, end });
        } else {
            intervals.push({ day: d, start: 0, end: 1440 });
        }
    }
    return intervals;
}

export function findConflict(rule: ScheduleRule, rules: ScheduleRule[], ignoreId?: string) {
    const intervals = getRuleIntervals(rule);

    for (const existing of rules) {
        if (existing.id === ignoreId || !existing.enabled) continue;

        for (const a of intervals) {
            for (const b of getRuleIntervals(existing)) {
                if (a.day === b.day && Math.max(a.start, b.start) < Math.min(a.end, b.end)) {
                    return { rule: existing, day: a.day };
                }
            }
        }
    }
    return null;
}

export function isRuleActive(rule: ScheduleRule, now = new Date()) {
    if (!rule.enabled || !rule.days.length) return false;

    const day = jsToDay(now.getDay());
    const mins = now.getHours() * 60 + now.getMinutes();
    const start = timeToMinutes(rule.startTime);
    const end = timeToMinutes(rule.endTime);

    if (start < end)
        return rule.days.includes(day) && mins >= start && mins < end;

    if (start > end) {
        if (rule.days.includes(day) && mins >= start) return true;
        if (rule.days.includes((day + 6) % 7) && mins < end) return true;
        return false;
    }

    return rule.days.includes(day);
}

export function formatDays(days: number[]) {
    if (!days.length) return "No days";
    if (days.length === 7) return "Every day";
    if (days.length === 5 && [0, 1, 2, 3, 4].every(d => days.includes(d))) return "Weekdays";
    if (days.length === 2 && [5, 6].every(d => days.includes(d))) return "Weekends";

    const order = [...days].sort();
    return order.map(d => DAY_NAMES[d]?.slice(0, 3)).join(", ");
}

const STATUS_NAMES: Record<string, string> = {
    online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible"
};

export function statusName(s: string) {
    return STATUS_NAMES[s] ?? s;
}
