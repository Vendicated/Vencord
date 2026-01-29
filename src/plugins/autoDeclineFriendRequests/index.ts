/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getUniqueUsername } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { React, RelationshipStore, RestAPI, SnowflakeUtils, UserStore, UserUtils, useEffect, useState } from "@webpack/common";

const LOG_KEY = "autoDeclineFriendRequests_log";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const INCOMING_REQUEST_TYPE = 3;

interface DeclineLogEntry {
    userId: string;
    username?: string;
    requestSince?: string;
    accountCreatedAt: number;
    accountAgeDays: number;
    declinedAt: number;
}

function LogViewer() {
    const [entries, setEntries] = useState<DeclineLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        setLoading(true);
        const stored = await DataStore.get<DeclineLogEntry[]>(LOG_KEY);
        setEntries(Array.isArray(stored) ? stored : []);
        setLoading(false);
    }

    async function clear() {
        await DataStore.set(LOG_KEY, []);
        setEntries([]);
    }

    useEffect(() => {
        refresh();
    }, []);

    const content = loading
        ? React.createElement(Paragraph, null, "Loading…")
        : entries.length === 0
            ? React.createElement(Paragraph, null, "No declined requests logged.")
            : React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 6 } },
                entries.map((entry, index) => (
                    React.createElement(
                        Paragraph,
                        { key: `${entry.userId}-${entry.declinedAt}-${index}` },
                        `${entry.username ?? entry.userId} · Account age: ${entry.accountAgeDays.toFixed(1)} days · Declined: ${new Date(entry.declinedAt).toLocaleString()}`
                    )
                ))
            );

    return React.createElement(
        "section",
        null,
        React.createElement(Heading, null, "Declined Friend Request Log"),
        React.createElement(
            "div",
            { style: { display: "flex", gap: 8, marginBottom: 8 } },
            React.createElement(Button, { onClick: refresh, size: "small" }, "Refresh"),
            React.createElement(Button, { onClick: clear, size: "small", variant: "dangerPrimary" }, "Clear")
        ),
        content
    );
}

const settings = definePluginSettings({
    minAccountAgeDays: {
        type: OptionType.NUMBER,
        description: "Decline friend requests if account age (days) is below this threshold",
        default: 7,
    },
    maxLogEntries: {
        type: OptionType.NUMBER,
        description: "Maximum number of declined request log entries to keep",
        default: 200,
    },
    logViewer: {
        type: OptionType.COMPONENT,
        component: () => React.createElement(LogViewer)
    }
});

let logEntries: DeclineLogEntry[] = [];
const inFlight = new Set<string>();

function getRequestKey(userId: string) {
    const since = RelationshipStore.getSince(userId);
    return `${userId}:${since ?? ""}`;
}

async function loadLog() {
    const stored = await DataStore.get<DeclineLogEntry[]>(LOG_KEY);
    logEntries = Array.isArray(stored) ? stored : [];
}

async function saveLog() {
    const limit = Math.max(0, settings.store.maxLogEntries || 0);
    if (limit > 0 && logEntries.length > limit) {
        logEntries = logEntries.slice(0, limit);
    }
    await DataStore.set(LOG_KEY, logEntries);
}

async function logDecline(entry: DeclineLogEntry) {
    logEntries.unshift(entry);
    await saveLog();
}

function getAccountAgeDays(userId: string) {
    const createdAt = SnowflakeUtils.extractTimestamp(userId);
    if (!createdAt) return null;
    const ageDays = (Date.now() - createdAt) / MS_PER_DAY;
    return { createdAt, ageDays };
}

async function declineRequest(userId: string) {
    const requestKey = getRequestKey(userId);
    if (inFlight.has(requestKey)) return;
    inFlight.add(requestKey);

    try {
        const accountAge = getAccountAgeDays(userId);
        if (!accountAge) return;

        if (accountAge.ageDays >= settings.store.minAccountAgeDays) return;

        await RestAPI.del({
            url: `/users/@me/relationships/${userId}`
        });

        const cachedUser = UserStore.getUser(userId);
        const user = cachedUser ?? await UserUtils.getUser(userId).catch(() => null);

        await logDecline({
            userId,
            username: user ? getUniqueUsername(user) : undefined,
            requestSince: RelationshipStore.getSince(userId),
            accountCreatedAt: accountAge.createdAt,
            accountAgeDays: accountAge.ageDays,
            declinedAt: Date.now(),
        });
    } finally {
        inFlight.delete(requestKey);
    }
}

async function scanIncomingRequests() {
    if (settings.store.minAccountAgeDays <= 0) return;

    const relationships = RelationshipStore.getMutableRelationships();
    for (const [userId, type] of relationships) {
        if (type === INCOMING_REQUEST_TYPE) {
            await declineRequest(userId);
        }
    }
}

export default definePlugin({
    name: "AutoDeclineFriendRequests",
    description: "Automatically declines friend requests from accounts younger than a configurable age.",
    authors: [Devs.maka],
    settings,

    flux: {
        RELATIONSHIP_ADD: scanIncomingRequests,
        RELATIONSHIP_UPDATE: scanIncomingRequests,
        CONNECTION_OPEN: scanIncomingRequests,
    },

    async start() {
        await loadLog();
        await scanIncomingRequests();
    }
});
