/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, Menu, RestAPI, showToast, Toasts } from "@webpack/common";

interface RecentMentionMessage {
    id?: string;
    channel_id?: string;
    channelId?: string;
}

interface ClearResult {
    fetched: number;
    acked: number;
    dismissed: number;
    failed: number;
}

const RecentMentionUtils = findByPropsLazy("deleteRecentMention", "fetchRecentMentions") as {
    deleteRecentMention(messageId: string): Promise<void> | void;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isWholeNumberInRange(value: unknown, min: number, max: number) {
    const numberValue = Number(value);

    return Number.isInteger(numberValue) && numberValue >= min && numberValue <= max;
}

const settings = definePluginSettings({
    fetchLimit: {
        type: OptionType.NUMBER,
        description: "How many recent mentions to fetch and clear per run. Discord's endpoint is paged, so run again if you have more.",
        default: 100,
        isValid: value => isWholeNumberInRange(value, 1, 100) ? true : "Use a whole number from 1 to 100."
    },
    dismissDelayMs: {
        type: OptionType.NUMBER,
        description: "Delay between dismiss requests, in milliseconds. Keep this non-zero to avoid bursty API behavior.",
        default: 250,
        isValid: value => isWholeNumberInRange(value, 0, 2000) ? true : "Use a whole number from 0 to 2000."
    },
    markRead: {
        type: OptionType.BOOLEAN,
        description: "Mark fetched mention channels as read before dismissing them.",
        default: true
    },
    includeRoleMentions: {
        type: OptionType.BOOLEAN,
        description: "Also fetch and clear role mentions.",
        default: true
    },
    includeEveryoneMentions: {
        type: OptionType.BOOLEAN,
        description: "Also fetch and clear @everyone/@here mentions.",
        default: true
    }
});

let isClearing = false;

function getMessageId(message: RecentMentionMessage) {
    return message.id;
}

function getChannelId(message: RecentMentionMessage) {
    return message.channel_id ?? message.channelId;
}

async function fetchRecentMentions() {
    const { body } = await RestAPI.get({
        url: "/users/@me/mentions",
        query: {
            limit: settings.store.fetchLimit,
            roles: settings.store.includeRoleMentions,
            everyone: settings.store.includeEveryoneMentions
        },
        retries: 1
    });

    if (Array.isArray(body)) return body as RecentMentionMessage[];
    if (Array.isArray(body?.messages)) return body.messages as RecentMentionMessage[];

    return [];
}

function ackMentions(mentions: RecentMentionMessage[]) {
    const channels = mentions
        .map(message => {
            const channelId = getChannelId(message);
            const messageId = getMessageId(message);

            if (!channelId || !messageId) return null;

            return {
                channelId,
                messageId,
                readStateType: 0
            };
        })
        .filter(Boolean);

    if (!channels.length) return 0;

    FluxDispatcher.dispatch({
        type: "BULK_ACK",
        context: "APP",
        channels
    });

    return channels.length;
}

async function dismissMention(messageId: string) {
    try {
        await RestAPI.del({
            url: `/users/@me/mentions/${messageId}`,
            retries: 2,
            oldFormErrors: true
        });

        FluxDispatcher.dispatch({
            type: "RECENT_MENTION_DELETE",
            id: messageId
        });

        return;
    } catch (error) {
        console.warn("[ClearRecentMentions] Direct dismiss failed, trying Discord's deleteRecentMention action", error);
    }

    await RecentMentionUtils.deleteRecentMention(messageId);
}

async function clearRecentMentions(): Promise<ClearResult> {
    if (isClearing) {
        throw new Error("Clear Recent Mentions is already running.");
    }

    isClearing = true;

    try {
        const mentions = await fetchRecentMentions();
        const result: ClearResult = {
            fetched: mentions.length,
            acked: settings.store.markRead ? ackMentions(mentions) : 0,
            dismissed: 0,
            failed: 0
        };

        const delay = Math.max(0, Number(settings.store.dismissDelayMs) || 0);

        for (const mention of mentions) {
            const messageId = getMessageId(mention);

            if (!messageId) {
                result.failed++;
                continue;
            }

            try {
                await dismissMention(messageId);
                result.dismissed++;
            } catch (error) {
                console.warn("[ClearRecentMentions] Failed to dismiss recent mention", mention, error);
                result.failed++;
            }

            if (delay > 0) await sleep(delay);
        }

        return result;
    } finally {
        isClearing = false;
    }
}

function formatResult(result: ClearResult) {
    const pieces = [`Fetched ${result.fetched}`, `marked read ${result.acked}`, `dismissed ${result.dismissed}`];

    if (result.failed) pieces.push(`failed ${result.failed}`);

    return pieces.join(", ");
}

async function runClearWithToast() {
    try {
        const result = await clearRecentMentions();
        const message = `Clear Recent Mentions: ${formatResult(result)}.`;

        showToast(message, result.failed ? Toasts.Type.FAILURE : Toasts.Type.SUCCESS);
    } catch (error) {
        console.error("[ClearRecentMentions] Failed to clear mentions", error);
        showToast(`Clear Recent Mentions failed: ${error instanceof Error ? error.message : String(error)}`, Toasts.Type.FAILURE);
    }
}

function ClearMentionsMenuItem() {
    return (
        <Menu.MenuItem
            id="vc-clear-recent-mentions"
            label="Clear Recent Mentions"
            action={runClearWithToast}
        />
    );
}

export default definePlugin({
    name: "ClearRecentMentions",
    description: "Adds a Mentions filter menu action to mark recent mentions as read and dismiss them from the Inbox Mentions tab.",
    tags: ["Notifications", "Shortcuts"],
    authors: [Devs.TheLonelyDevil],
    settings,

    patches: [{
        find: 'navId:"mentions-filter"',
        replacement: {
            match: /(navId:"mentions-filter".{0,220}?children:\[)/,
            replace: "$1$self.renderClearMentionsMenuItem(),"
        }
    }],

    clearRecentMentions,
    renderClearMentionsMenuItem: ErrorBoundary.wrap(ClearMentionsMenuItem, { noop: true })
});
