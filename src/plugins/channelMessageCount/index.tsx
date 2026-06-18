/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
  * Sometimes you want to find out which channels are the most active / important in a server.
  * This plugin shows a small badge with the total number of messages in each channel.
  */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { PermissionsBits, PermissionStore, React, RestAPI, Tooltip, useEffect, useState } from "@webpack/common";

const MAX_CONCURRENT_REQUESTS = 2;

const settings = definePluginSettings({
    refreshCountsAfter: {
        type: OptionType.NUMBER,
        description: "Refresh successful counts after this many minutes",
        default: 30,
        isValid: (value: number) => (value > 0 && value <= 1_440) || "Must be > 0 and <= 1440 (minutes)"
    },
    retryFailedCountsAfter: {
        type: OptionType.NUMBER,
        description: "Retry failed counts after this many seconds",
        default: 60,
        isValid: (value: number) => (value > 0 && value <= 300) || "Must be > 0 and <= 300 (seconds)"
    }
});

const NUMBER_FORMAT = new Intl.NumberFormat();
const COMPACT_NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1
});

type CountEntry =
    | {
        status: "loading";
        promise: Promise<number | null>;
        lastMessageId?: string | null;
    }
    | {
        status: "ready";
        count: number;
        fetchedAt: number;
        lastMessageId?: string | null;
    }
    | {
        status: "error";
        fetchedAt: number;
        retryAt: number;
        lastMessageId?: string | null;
    };

const countCache = new Map<string, CountEntry>();

let activeRequests = 0;
const queuedRequests: Array<() => void> = [];

function runNextQueuedRequest() {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) return;

    const next = queuedRequests.shift();
    if (!next) return;

    activeRequests++;
    next();
}

function enqueueRequest<T>(request: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
        queuedRequests.push(() => {
            request()
                .then(resolve, reject)
                .finally(() => {
                    activeRequests--;
                    runNextQueuedRequest();
                });
        });

        runNextQueuedRequest();
    });
}

function isSupportedChannel(channel: Channel) {
    if (!channel?.guild_id) return false;

    const isThread =
        [
            ChannelType.ANNOUNCEMENT_THREAD,
            ChannelType.PUBLIC_THREAD,
            ChannelType.PRIVATE_THREAD,
        ].includes(channel.type);

    return isThread
        || channel.type === ChannelType.GUILD_TEXT
        || channel.type === ChannelType.GUILD_ANNOUNCEMENT
        || channel.type === ChannelType.GUILD_FORUM
        || channel.type === ChannelType.GUILD_MEDIA;
}

function canFetchCount(channel: Channel) {
    try {
        return PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)
            && PermissionStore.can(PermissionsBits.READ_MESSAGE_HISTORY, channel);
    } catch {
        return false;
    }
}

function getLastMessageId(channel: Channel) {
    return channel.lastMessageId ?? null;
}

function getThreadCount(channel: Channel) {
    return channel.totalMessageSent ?? channel.messageCount ?? null;
}

async function fetchChannelCount(channel: Channel) {
    const { body } = await RestAPI.get({
        url: `/guilds/${channel.guild_id}/messages/search`,
        query: {
            channel_id: channel.id,
            include_nsfw: true,
            limit: 1
        },
        retries: 2
    });

    if (typeof body?.total_results === "number") return body.total_results;

    return null;
}

function getCachedCount(channel: Channel) {
    const entry = countCache.get(channel.id);
    if (!entry) return null;

    const lastMessageId = getLastMessageId(channel);
    if (entry.lastMessageId !== lastMessageId) return null;

    if (entry.status === "ready" && Date.now() - entry.fetchedAt > settings.store.refreshCountsAfter * 60 * 1_000) return null;
    if (entry.status === "error" && Date.now() >= entry.retryAt) return null;

    return entry;
}

function setErrorEntry(channel: Channel, retryAfter?: number) {
    const now = Date.now();
    const retryMs = typeof retryAfter === "number"
        ? Math.max(retryAfter * 1_000, 1_000)
        : settings.store.retryFailedCountsAfter * 1_000;

    countCache.set(channel.id, {
        status: "error",
        fetchedAt: now,
        retryAt: now + retryMs,
        lastMessageId: getLastMessageId(channel)
    });
}

function getOrFetchCount(channel: Channel) {
    const cached = getCachedCount(channel);
    if (cached) return cached.status === "loading" ? cached.promise : Promise.resolve(cached.status === "ready" ? cached.count : null);

    const threadCount = getThreadCount(channel);
    if (threadCount != null) {
        countCache.set(channel.id, {
            status: "ready",
            count: threadCount,
            fetchedAt: Date.now(),
            lastMessageId: getLastMessageId(channel)
        });

        return Promise.resolve(threadCount);
    }

    if (!isSupportedChannel(channel) || !canFetchCount(channel)) return Promise.resolve(null);

    const promise = enqueueRequest(() => fetchChannelCount(channel))
        .then(count => {
            if (count == null) {
                setErrorEntry(channel);
                return null;
            }

            countCache.set(channel.id, {
                status: "ready",
                count,
                fetchedAt: Date.now(),
                lastMessageId: getLastMessageId(channel)
            });

            return count;
        })
        .catch(error => {
            setErrorEntry(channel, error?.body?.retry_after ?? error?.retry_after);
            return null;
        });

    countCache.set(channel.id, {
        status: "loading",
        promise,
        lastMessageId: getLastMessageId(channel)
    });

    return promise;
}

function formatCompactCount(count: number) {
    return count >= 1_000 ? COMPACT_NUMBER_FORMAT.format(count) : NUMBER_FORMAT.format(count);
}

function MessageCountBadge({ channel }: { channel: Channel; }) {
    const [entry, setEntry] = useState<CountEntry | null>(() => getCachedCount(channel));

    useEffect(() => {
        let cancelled = false;

        setEntry(getCachedCount(channel));

        getOrFetchCount(channel).then(() => {
            if (!cancelled) setEntry(getCachedCount(channel));
        });

        return () => {
            cancelled = true;
        };
    }, [channel.id, channel.lastMessageId, channel.messageCount, channel.totalMessageSent]);

    useEffect(() => {
        if (entry?.status !== "error") return;

        const timeout = setTimeout(() => {
            getOrFetchCount(channel).then(() => setEntry(getCachedCount(channel)));
        }, Math.max(entry.retryAt - Date.now(), 1_000));

        return () => clearTimeout(timeout);
    }, [channel, entry]);

    if (entry?.status !== "ready") return null;

    const count = NUMBER_FORMAT.format(entry.count);

    return (
        <Tooltip text={`${count} messages`}>
            {tooltipProps => (
                <span
                    {...tooltipProps}
                    className="vc-channel-message-count"
                >
                    {formatCompactCount(entry.count)}
                </span>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "ChannelMessageCount",
    description: "Shows total messages count next to each channel name in a server.",
    authors: [Devs.amorfati],
    settings,
    patches: [
        {
            find: "UNREAD_IMPORTANT:",
            replacement: {
                match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                replace: (m, channel) => `${m},$self.renderMessageCountBadge({ channel: ${channel} })`
            }
        }
    ],

    renderMessageCountBadge: ErrorBoundary.wrap(({ channel }: { channel: Channel; }) => (
        <MessageCountBadge channel={channel} />
    ), { noop: true })
});
