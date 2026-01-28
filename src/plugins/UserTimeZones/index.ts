//@ts-ignore
//@ts-nocheck
/*
 * UserTimeZones (userplugin)
 *
 * Store a per-user GMT/UTC offset (e.g. GMT+2) and show the user's current
 * local time in 12-hour format.
 */

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { registerCommand, unregisterCommand } from "@api/Commands";
import { get as dataStoreGet, set as dataStoreSet } from "@api/DataStore";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import type { User } from "@vencord/discord-types";
import { Devs } from "@utils/constants";
import { Menu, React, Text, useEffect, useReducer, useState } from "@webpack/common";

type OffsetMinutesMap = Record<string, number>; // userId -> offset minutes from UTC

const STORE_KEY = "UserTimeZones:gmtOffsets";

let offsetsCache: OffsetMinutesMap = {};
let offsetsLoaded = false;
const offsetsListeners = new Set<() => void>();

function subscribeOffsets(listener: () => void) {
    offsetsListeners.add(listener);
    return () => offsetsListeners.delete(listener);
}

function notifyOffsets() {
    for (const l of offsetsListeners) l();
}

async function ensureOffsetsLoaded() {
    if (offsetsLoaded) return;
    offsetsCache = (await dataStoreGet(STORE_KEY)) ?? {};
    offsetsLoaded = true;
}

async function setOffsetMinutes(userId: string, offsetMinutes: number): Promise<void> {
    await ensureOffsetsLoaded();
    offsetsCache[userId] = offsetMinutes;
    await dataStoreSet(STORE_KEY, offsetsCache);
    notifyOffsets();
}

async function clearOffsetMinutes(userId: string): Promise<void> {
    await ensureOffsetsLoaded();
    if (!(userId in offsetsCache)) return;
    delete offsetsCache[userId];
    await dataStoreSet(STORE_KEY, offsetsCache);
    notifyOffsets();
}

function getOffsetMinutesSync(userId: string): number | undefined {
    return offsetsCache[userId];
}

function normalizeWeekday(input: string): string {
    const s = input.toLowerCase();
    const stripped = s.replaceAll(".", "");

    if (stripped.startsWith("mon")) return "Mon";
    if (stripped.startsWith("tue")) return "Tue";
    if (stripped.startsWith("wed")) return "Wed";
    // user requested "Thr"
    if (stripped.startsWith("thu")) return "Thr";
    if (stripped.startsWith("fri")) return "Fri";
    if (stripped.startsWith("sat")) return "Sat";
    if (stripped.startsWith("sun")) return "Sun";

    return stripped.length ? stripped[0].toUpperCase() + stripped.slice(1) : stripped;
}

function formatGmtLabel(offsetMinutes: number): string {
    if (offsetMinutes === 0) return "GMT";
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMinutes);
    const hh = Math.floor(abs / 60);
    const mm = abs % 60;
    return mm === 0 ? `GMT${sign}${hh}` : `GMT${sign}${hh}:${String(mm).padStart(2, "0")}`;
}

function formatTimeForOffset(offsetMinutes: number, now = new Date()): string {
    // `Date#getTime()` is already an absolute UTC timestamp (ms since epoch).
    // Only apply the user's configured GMT offset once.
    const target = new Date(now.getTime() + offsetMinutes * 60_000);

    const parts = new Intl.DateTimeFormat(undefined, {
        timeZone: "UTC",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        weekday: "short",
    }).formatToParts(target);

    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;

    const hour = get("hour") ?? "";
    const minute = get("minute") ?? "";
    const dayPeriodRaw = get("dayPeriod") ?? "";
    const weekdayRaw = get("weekday") ?? "";

    const dayPeriod = dayPeriodRaw.toUpperCase();
    const weekday = normalizeWeekday(weekdayRaw);

    return `${hour}:${minute} ${dayPeriod} ${weekday}`;
}

function buildGmtOffsetsList(): number[] {
    // Whole-hour offsets from GMT-12 to GMT+14.
    const out: number[] = [];
    for (let h = -12; h <= 14; h++) out.push(h * 60);
    return out;
}

function useOffsetsReady() {
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    useEffect(() => {
        let unsub: (() => void) | undefined;
        ensureOffsetsLoaded().then(() => forceUpdate());
        unsub = subscribeOffsets(forceUpdate);
        return () => unsub?.();
    }, []);

    return offsetsLoaded;
}

const TimeText = ErrorBoundary.wrap(({ userId, showLabel }: { userId: string; showLabel?: boolean; }) => {
    const ready = useOffsetsReady();
    const [tick, setTick] = useState(() => Date.now());

    useEffect(() => {
        // Update once per minute (aligned roughly to the minute boundary).
        const update = () => setTick(Date.now());
        const msToNextMinute = 60_000 - (Date.now() % 60_000);
        const timeout = setTimeout(() => {
            update();
            const interval = setInterval(update, 60_000);
            (timeout as any).__interval = interval;
        }, msToNextMinute);

        return () => {
            clearTimeout(timeout);
            const interval = (timeout as any).__interval;
            if (interval) clearInterval(interval);
        };
    }, []);

    if (!ready) return null;
    const offset = getOffsetMinutesSync(userId);
    if (offset == null) return null;

    const time = formatTimeForOffset(offset, new Date(tick));
    const label = formatGmtLabel(offset);
    const text = showLabel ? `${time} (${label})` : time;

    return React.createElement(Text, { variant: "text-xs/normal" }, text);
}, { noop: true });

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user?.id) return;

    const el = React.createElement;
    const offsets = buildGmtOffsetsList();

    const submenu: any[] = offsets.map(offset =>
        el(Menu.MenuItem as any, {
            id: `vc-usertimezones-set-${offset}`,
            label: formatGmtLabel(offset),
            action: () => setOffsetMinutes(user.id, offset),
        })
    );

    submenu.push(
        el(Menu.MenuSeparator as any, null),
        el(Menu.MenuItem as any, {
            id: "vc-usertimezones-clear",
            label: "Clear Timezone",
            action: () => clearOffsetMinutes(user.id),
        }),
    );

    children.push(
        el(Menu.MenuSeparator as any, null),
        el(Menu.MenuItem as any, {
            id: "vc-usertimezones-root",
            label: "Set Timezone (GMT)",
            children: submenu as any,
        }),
    );
};

export default definePlugin({
    name: "UserTimeZones",
    description: "Set per-user GMT offsets and show their local time.",
    authors: [Devs.AydenC77],
    dependencies: ["MemberListDecoratorsAPI"],

    contextMenus: {
        "user-context": UserContextMenuPatch
    },

    patches: [
        // User Popout, User Profile Modal, Direct Messages Side Profile
        {
            find: "#{intl::USER_PROFILE_LOAD_ERROR}",
            replacement: {
                match: /(\.fetchError.+?\?)null/,
                replace: (_, rest) => `${rest}$self.UserTimeZonesProfileLine({ userId: arguments[0]?.userId })`
            }
        }
    ],

    start() {
        ensureOffsetsLoaded();

        addMemberListDecorator("UserTimeZones", ({ user }) => {
            if (!user?.id) return null;
            return React.createElement(TimeText, { userId: user.id, showLabel: false });
        });

        // Slash command to show time (optional)
        registerCommand({
            name: "usertime",
            description: "Show the configured local time (GMT offset) for a user.",
            options: [
                {
                    name: "user",
                    description: "User to show time for",
                    type: 6, // USER
                    required: true,
                },
            ],
            execute: async (args: any[]) => {
                const user = args.find(a => a.name === "user")?.value;
                if (!user) return { content: "Missing user." };

                await ensureOffsetsLoaded();
                const userId = String(user);
                const offset = offsetsCache[userId];
                if (offset == null) return { content: "No timezone set for this user." };
                return { content: `${formatTimeForOffset(offset)} (${formatGmtLabel(offset)})` };
            },
        }, "UserTimeZones");
    },

    stop() {
        removeMemberListDecorator("UserTimeZones");
        unregisterCommand("usertime");
    },

    UserTimeZonesProfileLine: ErrorBoundary.wrap(({ userId }: { userId: string; }) => {
        if (!userId) return null;
        // Show label in profiles so it's clear what offset is used.
        return React.createElement(TimeText, { userId, showLabel: true });
    }, { noop: true }),
});
