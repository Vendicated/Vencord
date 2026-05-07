/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React, Tooltip, UserStore } from "@webpack/common";

// ─── Timezone list ────────────────────────────────────────────────────────────

const TIMEZONE_LIST = [
    { label: "UTC-12 — IDLW (Intl. Date Line West)", value: "Etc/GMT+12" },
    { label: "UTC-11 — SST (Samoa Standard Time)", value: "Pacific/Pago_Pago" },
    { label: "UTC-10 — HST (Hawaii Standard Time)", value: "Pacific/Honolulu" },
    { label: "UTC-9 — AKST (Alaska Standard Time)", value: "America/Anchorage" },
    { label: "UTC-8 — PST (Pacific Standard Time)", value: "America/Los_Angeles" },
    { label: "UTC-7 — MST (Mountain Standard Time)", value: "America/Denver" },
    { label: "UTC-6 — CST (Central Standard Time)", value: "America/Chicago" },
    { label: "UTC-5 — EST (Eastern Standard Time)", value: "America/New_York" },
    { label: "UTC-4 — AST (Atlantic Standard Time)", value: "America/Halifax" },
    { label: "UTC-3:30 — NST (Newfoundland Standard Time)", value: "America/St_Johns" },
    { label: "UTC-3 — BRT (Brasília / Buenos Aires Time)", value: "America/Sao_Paulo" },
    { label: "UTC-2 — GST (South Georgia Time)", value: "Atlantic/South_Georgia" },
    { label: "UTC-1 — AZOT (Azores Standard Time)", value: "Atlantic/Azores" },
    { label: "UTC+0 — GMT (Greenwich Mean Time)", value: "Europe/London" },
    { label: "UTC+1 — CET (Central European Time)", value: "Europe/Paris" },
    { label: "UTC+2 — EET (Eastern European / S. Africa)", value: "Europe/Kiev" },
    { label: "UTC+3 — MSK (Moscow / E. Africa Time)", value: "Europe/Moscow" },
    { label: "UTC+4 — GST (Gulf Standard Time)", value: "Asia/Dubai" },
    { label: "UTC+5 — PKT (Pakistan Standard Time)", value: "Asia/Karachi" },
    { label: "UTC+5:30 — IST (India Standard Time)", value: "Asia/Kolkata" },
    { label: "UTC+6 — BST (Bangladesh Standard Time)", value: "Asia/Dhaka" },
    { label: "UTC+7 — ICT (Indochina / W. Indonesia)", value: "Asia/Bangkok" },
    { label: "UTC+8 — CST (China / Singapore / Perth)", value: "Asia/Shanghai" },
    { label: "UTC+9 — JST (Japan / Korea Standard Time)", value: "Asia/Tokyo" },
    { label: "UTC+10 — AEST (Australian Eastern Time)", value: "Australia/Sydney" },
    { label: "UTC+11 — SBT (Solomon Islands Time)", value: "Pacific/Guadalcanal" },
    { label: "UTC+12 — NZST (New Zealand Standard Time)", value: "Pacific/Auckland" },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getUserTimezoneMap(): Record<string, string> {
    try {
        return JSON.parse(settings.store.userTimezones || "{}");
    } catch {
        return {};
    }
}

function setUserTimezone(userId: string, timezone: string | null) {
    const map = getUserTimezoneMap();
    if (timezone === null) {
        delete map[userId];
    } else {
        map[userId] = timezone;
    }
    settings.store.userTimezones = JSON.stringify(map);
}

function getTimezoneForUser(userId: string): { timezone: string; } | null {
    const isSelf = userId === UserStore.getCurrentUser()?.id;
    if (isSelf) {
        return { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
    const map = getUserTimezoneMap();
    if (map[userId]) {
        return { timezone: map[userId] };
    }
    return null;
}

// ─── Time utilities ───────────────────────────────────────────────────────────

function formatTime(timezone: string): string {
    try {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        }).format(new Date());
    } catch {
        return "??:??";
    }
}

function getTimezoneOffset(timezone: string): number {
    try {
        const now = new Date();
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
        const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
        return (tzDate.getTime() - utcMs) / 3600000;
    } catch {
        return 0;
    }
}

function formatOffset(offsetHours: number): string {
    const sign = offsetHours >= 0 ? "+" : "-";
    const abs = Math.abs(offsetHours);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return m > 0 ? `UTC${sign}${h}:${String(m).padStart(2, "0")}` : `UTC${sign}${h}`;
}

function getHourDifference(timezone: string): number {
    const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return getTimezoneOffset(timezone) - getTimezoneOffset(myTz);
}

function getTimeIcon(timezone: string): string {
    try {
        const hour = parseInt(
            new Intl.DateTimeFormat("en-US", {
                timeZone: timezone,
                hour: "numeric",
                hour12: false,
            }).format(new Date()),
            10
        );
        if (hour >= 6 && hour < 12) return "🌅";
        if (hour >= 12 && hour < 17) return "☀️";
        if (hour >= 17 && hour < 21) return "🌆";
        return "🌙";
    } catch {
        return "🕐";
    }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const settings = definePluginSettings({
    userTimezones: {
        type: OptionType.STRING,
        description: "Stored user timezone overrides (managed automatically)",
        default: "{}",
        hidden: true,
    },
    showTimeDifference: {
        type: OptionType.BOOLEAN,
        description: "Show the hour difference from your own timezone",
        default: true,
    },
    showTimeOfDay: {
        type: OptionType.BOOLEAN,
        description: "Show an emoji indicating their time of day",
        default: true,
    },
});

// ─── Badge component ──────────────────────────────────────────────────────────

function TimezoneBadge({ userId }: { userId: string; }) {
    const result = getTimezoneForUser(userId);
    if (!result) return null;

    const { timezone } = result;
    const isSelf = userId === UserStore.getCurrentUser()?.id;

    const localTime = formatTime(timezone);
    const offset = formatOffset(getTimezoneOffset(timezone));
    const hourDiff = getHourDifference(timezone);
    const timeIcon = settings.store.showTimeOfDay ? getTimeIcon(timezone) : "";

    const absDiff = Math.abs(hourDiff);
    const diffText = settings.store.showTimeDifference && !isSelf
        ? hourDiff === 0
            ? " · same timezone"
            : ` · ${absDiff % 1 !== 0 ? absDiff.toFixed(1) : absDiff}h ${hourDiff > 0 ? "ahead" : "behind"} you`
        : "";

    const tooltipText = `${timeIcon} ${localTime} (${offset})${diffText}`;

    return React.createElement(
        Tooltip,
        { text: tooltipText },
        (tooltipProps: any) => React.createElement(
            "span",
            {
                ...tooltipProps,
                style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    marginLeft: "6px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    background: "var(--background-modifier-hover)",
                    borderRadius: "4px",
                    padding: "1px 5px",
                    cursor: "default",
                    userSelect: "none",
                    verticalAlign: "middle",
                    lineHeight: "1.4",
                },
            },
            timeIcon ? React.createElement("span", { style: { fontSize: "10px" } }, timeIcon) : null,
            React.createElement("span", null, localTime)
        )
    );
}

// ─── Context menu patch ───────────────────────────────────────────────────────

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user || user.id === UserStore.getCurrentUser()?.id) return;

    const map = getUserTimezoneMap();
    const currentTz = map[user.id] ?? null;

    const tzItems = TIMEZONE_LIST.map(({ label, value }) =>
        React.createElement(Menu.MenuItem, {
            key: `vc-tz-${value}`,
            id: `vc-tz-${value.replace(/[^a-zA-Z0-9]/g, "-")}`,
            label: (currentTz === value ? "✓ " : "") + label,
            action: () => setUserTimezone(user.id, value),
        })
    );

    if (currentTz) {
        tzItems.push(
            React.createElement(Menu.MenuSeparator, { key: "vc-tz-sep" }),
            React.createElement(Menu.MenuItem, {
                key: "vc-tz-clear",
                id: "vc-tz-clear",
                label: "✖ Clear Timezone",
                action: () => setUserTimezone(user.id, null),
            })
        );
    }

    children.push(
        React.createElement(Menu.MenuSeparator, { key: "vc-tz-main-sep" }),
        React.createElement(
            Menu.MenuItem,
            {
                key: "vc-tz-parent",
                id: "vc-tz-parent",
                label: "🕐 Set Timezone",
            },
            ...tzItems
        )
    );
};

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "MutualTimeZones",
    description: "Shows a local time badge next to usernames. Right-click any user to set their timezone.",
    authors: [{ name: "you", id: 0n }],
    settings,

    patches: [
        {
            find: "appendedInlineContent:null!=",
            replacement: {
                match: /appendedInlineContent:null!=(\i)\?\(0,(\i)\.jsxs\)\((\i)\.Fragment,\{children:\[" ",\1\]\}\):null/,
                replace: "appendedInlineContent:$self.injectBadge($1,$2,$3,typeof t!=\"undefined\"?t.id:void 0)",
            },
        },
    ],

    start() {
        addContextMenuPatch("user-context", userContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("user-context", userContextMenuPatch);
    },

    injectBadge(existing: any, jsxs: any, Fragment: any, userId: string | undefined) {
        const badge = userId
            ? React.createElement(TimezoneBadge, { userId })
            : null;

        const existingEl = existing != null
            ? jsxs(Fragment, { children: [" ", existing] })
            : null;

        if (!badge && !existingEl) return null;
        return React.createElement(React.Fragment, null, badge, existingEl);
    },
});
