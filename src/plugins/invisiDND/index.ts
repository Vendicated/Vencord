/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React, showToast } from "@webpack/common";

const logger = new Logger("InvisiDND");

const StatusSetting = getUserSettingLazy<string>("status", "status")!;

const settings = definePluginSettings({
    // Called "active" and not "enabled" because the latter is reserved for
    // Vencord's own plugin toggle in the same settings object.
    active: {
        type: OptionType.BOOLEAN,
        description: "Whether InvisiDND is active (invisible to others, silent locally)",
        default: false,
        onChange: v => (v ? enableInvisiDND() : disableInvisiDND()),
    },
    suppressNotifications: {
        type: OptionType.BOOLEAN,
        description: "Suppress desktop notification popups while InvisiDND is on",
        default: true,
    },
    suppressSounds: {
        type: OptionType.BOOLEAN,
        description: "Suppress notification sounds while InvisiDND is on",
        default: true,
    },
    suppressCalls: {
        type: OptionType.BOOLEAN,
        description: "Suppress incoming call popups and ringing while InvisiDND is on",
        default: true,
    },
    excludedUserIds: {
        type: OptionType.STRING,
        description: "Users that always notify normally, even with InvisiDND on. Paste user IDs (right-click a user > Copy User ID), one per line or comma-separated.",
        default: "",
        multiline: true,
    },
    restorePreviousStatus: {
        type: OptionType.BOOLEAN,
        description: "Restore your previous status when turning InvisiDND off",
        default: true,
    },
});

let previousStatus: string | null = null;
let disableTimer: ReturnType<typeof setTimeout> | null = null;

const isActive = () => !!settings.store.active;
const setActive = (v: boolean) => { settings.store.active = v; };

function readStatus(): string | null {
    try {
        return StatusSetting.getSetting() ?? null;
    } catch (e) {
        logger.warn("Could not read current status", e);
        return null;
    }
}

async function applyStatus(status: string) {
    try {
        // Status writes are rate limited, so skip when already correct.
        if (readStatus() === status) return true;
        await StatusSetting.updateSetting(status);
        return true;
    } catch (e) {
        logger.warn("Could not set status to " + status, e);
        return false;
    }
}

function parseExcludedIds() {
    const raw = settings.store.excludedUserIds ?? "";
    return new Set(
        raw.split(/[\s,;]+/)
            .map(s => s.trim())
            .filter(s => /^\d{5,}$/.test(s))
    );
}

async function enableInvisiDND(silent = false) {
    previousStatus ??= readStatus();
    const ok = await applyStatus("invisible");
    if (!silent) {
        showToast(ok
            ? "InvisiDND on: you appear offline, notifications silenced"
            : "InvisiDND on: could not set Invisible automatically — pick it in the status menu");
    }
}

async function disableInvisiDND(silent = false) {
    clearDisableTimer();
    if (settings.store.restorePreviousStatus && previousStatus && previousStatus !== "invisible") {
        await applyStatus(previousStatus);
    }
    previousStatus = null;
    if (!silent) showToast("InvisiDND off");
}

function clearDisableTimer() {
    if (disableTimer) {
        clearTimeout(disableTimer);
        disableTimer = null;
    }
}

function armDisableTimer(ms: number | null) {
    clearDisableTimer();
    if (ms == null) return;
    disableTimer = setTimeout(() => {
        disableTimer = null;
        if (isActive()) setActive(false);
    }, ms);
}

function msUntilMidnight() {
    return Math.max(0, new Date().setHours(24, 0, 0, 0) - Date.now());
}

const PICKER_DURATIONS: Array<{ label: string; ms: number | null; today?: boolean; }> = [
    { label: "30 minutes", ms: 30 * 60 * 1000 },
    { label: "1 hour", ms: 60 * 60 * 1000 },
    { label: "4 hours", ms: 4 * 60 * 60 * 1000 },
    { label: "Today", ms: null, today: true },
    { label: "Until I turn it off", ms: null },
];

const SUBMENU_TOGGLES = [
    { id: "popups", label: "Notification popups", key: "suppressNotifications" },
    { id: "sounds", label: "Notification sounds", key: "suppressSounds" },
    { id: "calls", label: "Incoming calls", key: "suppressCalls" },
] as const;

function InvisiDNDDot() {
    return React.createElement(
        "svg",
        { width: 10, height: 10, viewBox: "0 0 20 20", "aria-hidden": true, style: { display: "block" } },
        React.createElement("circle", { cx: 10, cy: 10, r: 10, fill: "#80848e" }),
        React.createElement("rect", { x: 4, y: 8, width: 12, height: 4, rx: 2, fill: "#313338" })
    );
}

function buildPickerSubmenu() {
    const toggles = SUBMENU_TOGGLES.map(t =>
        React.createElement(Menu.MenuCheckboxItem, {
            id: "invisidnd-sub-" + t.id,
            label: t.label,
            checked: !!settings.store[t.key],
            action: () => { settings.store[t.key] = !settings.store[t.key]; },
            dontCloseOnAction: true,
        })
    );
    const durations = PICKER_DURATIONS.map(d =>
        React.createElement(Menu.MenuItem, {
            id: "invisidnd-dur-" + d.label.replace(/\s+/g, "-").toLowerCase(),
            label: d.label,
            action: () => {
                const ms = d.today ? msUntilMidnight() : d.ms;
                if (!isActive()) setActive(true);
                armDisableTimer(ms);
                showToast(ms ? `InvisiDND on for ${d.label.toLowerCase()}` : "InvisiDND on until turned off");
            },
            dontCloseOnAction: true,
        })
    );
    return [...toggles, ...durations];
}

export default definePlugin({
    name: "InvisiDND",
    description: "Extra status: appear Invisible to others while silencing notifications and sounds locally (like DND). Adds an InvisiDND entry to the status picker, with a per-user exclusion list.",
    authors: [Devs.Ovima],
    tags: ["Notifications", "Privacy", "Utility"],
    settings,

    patches: [
        {
            // MESSAGE_CREATE handler: the desktop-popup gate and the sound
            // option. Excluded authors bypass suppression entirely.
            find: '"NotificationStore"',
            replacement: [
                {
                    match: /(\i\.\i\.getDesktopType\(\)===\i\.\i\.NEVER)\)return (\i)\((\i)\),\3&&(\i\.\i)\.playNotificationSound\((\i),(\i)\),!1;/,
                    replace: "$1||($self.shouldSuppressNotifications()&&!$self.isExcluded(a?.author?.id)))return $2($3),$self.shouldSuppressSounds()&&!$self.isExcluded(a?.author?.id)?!1:$3&&$4.playNotificationSound($5,$6),!1;",
                },
                {
                    match: /sound:(\i\?\i:void 0,volume:\i,onClick)/,
                    replace: "sound:($self.shouldSuppressSounds()&&!$self.isExcluded(a?.author?.id))?undefined:$1",
                },
            ],
        },
        {
            // Global sound gate: covers message pings, call ringing and
            // voice join/leave blips in one place.
            find: '"NotificationSettingsStore"',
            replacement: {
                match: /isSoundDisabled\((\i)\)\{return/,
                replace: "isSoundDisabled($1){if($self.shouldSuppressSounds())return!0;return",
            },
        },
        {
            // IncomingCallStore already hides calls behind its DND flag;
            // extend that to this mode. Getters are read live on call events.
            find: '"IncomingCallStore"',
            replacement: [
                {
                    match: /getIncomingCalls\(\)\{return/,
                    replace: "getIncomingCalls(){if($self.callsSuppressed())return[];return",
                },
                {
                    match: /hasIncomingCalls\(\)\{return/,
                    replace: "hasIncomingCalls(){if($self.callsSuppressed())return!1;return",
                },
                {
                    match: /(\i=\i\.\i\.getStatus\(\)===\i\.\i\.DND\|\|\i\.\i\.getSetting\(\))(?=\})/,
                    replace: "$1||$self.callsSuppressed()",
                },
            ],
        },
        {
            // Status submenu renders [online, sep, idle, dnd, invisible, ...],
            // so this inserts a 5th entry right after Invisible. No closing
            // bracket: the array continues past this point.
            find: '"menu-separator-statuses"',
            replacement: {
                match: /children:\[(\i),\(0,(\i)\.jsx\)\((\i\.\i),\{\},"menu-separator-statuses"\),(\i),(\i),(\i)/,
                replace: 'children:[$1,(0,$2.jsx)($3,{},"menu-separator-statuses"),$4,$5,$6,$self.renderPickerItem()',
            },
        },
    ],

    commands: [
        {
            name: "invisidnd",
            description: "Toggle InvisiDND (invisible to others, silent locally)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "value",
                    description: "On/off (default: toggle)",
                    required: false,
                    type: ApplicationCommandOptionType.BOOLEAN,
                },
            ],
            execute: async (args, ctx) => {
                const value = findOption<boolean>(args, "value", !isActive());
                setActive(value);
                sendBotMessage(ctx.channel.id, {
                    content: value ? "InvisiDND enabled." : "InvisiDND disabled.",
                });
            },
        },
    ],

    toolboxActions: {
        "Toggle InvisiDND": () => setActive(!isActive()),
    },

    start() {
        if (isActive()) enableInvisiDND(true);
    },

    shouldSuppressNotifications() {
        return isActive() && !!settings.store.suppressNotifications;
    },

    shouldSuppressSounds() {
        return isActive() && !!settings.store.suppressSounds;
    },

    callsSuppressed() {
        return isActive() && !!settings.store.suppressCalls;
    },

    isExcluded(userId?: string | null) {
        return !!userId && isActive() && parseExcludedIds().has(userId);
    },

    renderPickerItem() {
        const active = isActive();
        return React.createElement(Menu.MenuItem, {
            id: "invisidnd-status",
            keepItemStyles: true,
            hasSubmenu: true,
            label: "InvisiDND",
            subtext: active ? "Active: invisible + silent" : "Invisible + silent locally",
            iconLeft: InvisiDNDDot,
            leadingAccessory: { type: "icon", icon: InvisiDNDDot },
            action: () => setActive(!active),
            dontCloseOnAction: true,
        }, buildPickerSubmenu());
    },
});
