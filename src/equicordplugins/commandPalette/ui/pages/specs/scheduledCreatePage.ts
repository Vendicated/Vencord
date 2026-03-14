/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { addScheduledMessage } from "@equicordplugins/scheduledMessages/utils";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";

import { resolveAllChannels } from "../../../query/resolvers";
import type { PalettePageSpec, PaletteSuggestion } from "../types";

const LIMIT = 12;
const IN_WORDS = ["in", "en", "dans", "em", "fra", "через"];
const TODAY_WORDS = ["today", "hoy", "aujourdhui", "heute", "oggi", "hoje", "сегодня"];
const TOMORROW_WORDS = ["tomorrow", "manana", "demain", "morgen", "domani", "amanha", "завтра"];
const AT_WORDS = ["at", "a", "alle", "às", "в"];
const MINUTE_UNITS = ["m", "min", "mins", "minute", "minutes", "minuto", "minutos", "minute", "minutes", "minute", "minuten", "м", "мин", "минута", "минут"];
const HOUR_UNITS = ["h", "hr", "hrs", "hour", "hours", "hora", "horas", "heure", "heures", "stunde", "stunden", "ч", "час", "часа", "часов"];
const DAY_UNITS = ["d", "day", "days", "dia", "dias", "jour", "jours", "tag", "tage", "giorno", "giorni", "д", "день", "дня", "дней"];

function normalizeLocaleToken(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[.'’]/g, "")
        .replace(/\s+/g, " ");
}

function startsWithWord(input: string, words: string[]): string | null {
    for (const word of words) {
        if (input === word) return word;
        if (input.startsWith(`${word} `)) return word;
    }

    return null;
}

function parseClockToken(value: string, base: Date): number | null {
    const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return null;

    const rawHour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2] ?? "0", 10);
    const meridiem = match[3]?.toLowerCase();

    if (Number.isNaN(rawHour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null;

    let hour = rawHour;
    if (meridiem) {
        if (hour < 1 || hour > 12) return null;
        if (meridiem === "pm" && hour < 12) hour += 12;
        if (meridiem === "am" && hour === 12) hour = 0;
    } else if (hour < 0 || hour > 23) {
        return null;
    }

    const candidate = new Date(base);
    candidate.setHours(hour, minute, 0, 0);
    return candidate.getTime();
}

function parseScheduledTimeInput(input: string): number | null {
    const normalized = input.trim();
    if (!normalized) return null;

    const lower = normalizeLocaleToken(normalized);
    const now = Date.now();

    const relativePrefix = startsWithWord(lower, IN_WORDS);
    const relative = relativePrefix
        ? lower.slice(relativePrefix.length).trim().match(/^(\d+)\s*([^\s]+)$/)
        : null;
    if (relative) {
        const amount = Number.parseInt(relative[1], 10);
        if (amount < 1) return null;
        const unit = normalizeLocaleToken(relative[2]);
        const multiplier = MINUTE_UNITS.includes(unit)
            ? 60_000
            : HOUR_UNITS.includes(unit)
                ? 3_600_000
                : DAY_UNITS.includes(unit)
                    ? 86_400_000
                    : null;
        if (!multiplier) return null;
        return now + amount * multiplier;
    }

    const tomorrowWord = startsWithWord(lower, TOMORROW_WORDS);
    if (tomorrowWord) {
        let remainder = lower.slice(tomorrowWord.length).trim();
        const atWord = startsWithWord(remainder, AT_WORDS);
        if (atWord) remainder = remainder.slice(atWord.length).trim();
        if (!remainder) return null;

        const base = new Date();
        base.setDate(base.getDate() + 1);
        return parseClockToken(remainder, base);
    }

    const todayWord = startsWithWord(lower, TODAY_WORDS);
    if (todayWord) {
        let remainder = lower.slice(todayWord.length).trim();
        const atWord = startsWithWord(remainder, AT_WORDS);
        if (atWord) remainder = remainder.slice(atWord.length).trim();
        if (!remainder) return null;

        const timestamp = parseClockToken(remainder, new Date());
        return timestamp && timestamp > now ? timestamp : null;
    }

    const clockOnly = parseClockToken(normalized, new Date());
    if (clockOnly) {
        if (clockOnly > now) return clockOnly;
        return clockOnly + 86_400_000;
    }

    const absolute = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[ t](\d{1,2}:\d{2}(?:\s*(?:am|pm))?))?$/i);
    if (absolute) {
        if (absolute[2]) {
            const [year, month, day] = absolute[1].split("-").map(part => Number.parseInt(part, 10));
            const base = new Date(year, month - 1, day);
            return parseClockToken(absolute[2], base);
        }

        const dateOnly = new Date(`${absolute[1]}T09:00:00`);
        const timestamp = dateOnly.getTime();
        if (Number.isNaN(timestamp) || timestamp <= now) return null;
        return timestamp;
    }

    const parsed = new Date(normalized).getTime();
    if (Number.isNaN(parsed) || parsed <= now) return null;
    return parsed;
}

function resolveChannelId(channelInput: string, selectedChannelId: string | null): string | null {
    if (selectedChannelId && ChannelStore.getChannel(selectedChannelId)) {
        return selectedChannelId;
    }

    const typed = channelInput.trim();
    if (typed) {
        const match = resolveAllChannels(typed, { limit: 1 })[0];
        if (match) return match.id;
        return null;
    }

    const currentChannelId = SelectedChannelStore.getChannelId();
    if (!currentChannelId) return null;
    return ChannelStore.getChannel(currentChannelId) ? currentChannelId : null;
}

async function ensureScheduledMessagesPluginEnabled() {
    const plugin = plugins.ScheduledMessages;
    if (!plugin) return false;
    if (isPluginEnabled(plugin.name)) return true;

    const success = await toggleEnabled(plugin.name);
    return Boolean(success && isPluginEnabled(plugin.name));
}

const scheduledCreatePageSpec: PalettePageSpec = {
    id: "scheduled-create",
    title: "Create Scheduled Message",
    submitLabel: "Create Scheduled Message",
    fields: [
        { key: "channel", label: "Channel", type: "picker", placeholder: "Current channel, DM, or group DM", suggestionLimit: LIMIT },
        { key: "time", label: "Time", type: "text", placeholder: "in 10m, tomorrow 5pm, 2026-02-14 18:00" },
        { key: "message", label: "Message", type: "text", placeholder: "Message content" }
    ],
    resolveSuggestions(fieldKey, query) {
        if (fieldKey !== "channel") return [];

        const trimmed = query.trim();
        const resolved = resolveAllChannels(trimmed, {
            includeAllWhenEmpty: trimmed.length === 0,
            limit: LIMIT
        }).map(entry => {
            const channel = ChannelStore.getChannel(entry.id);
            const kind: PaletteSuggestion["kind"] = channel
                ? (typeof channel.isDM === "function" && channel.isDM())
                    ? "user"
                    : (typeof channel.isGroupDM === "function" && channel.isGroupDM())
                        ? "generic"
                        : "channel"
                : "channel";
            return {
                id: entry.id,
                label: entry.display,
                iconUrl: entry.iconUrl,
                kind
            };
        });

        return resolved satisfies PaletteSuggestion[];
    },
    validate(context) {
        const message = context.values.message?.trim() ?? "";
        if (!message) return "Message content is required.";

        const scheduledTime = parseScheduledTimeInput(context.values.time ?? "");
        if (!scheduledTime) return "Enter a valid future time.";

        const channelId = resolveChannelId(context.values.channel ?? "", context.selectedIds.channel ?? null);
        if (!channelId) return "Select a valid channel.";

        return null;
    },
    async submit(context) {
        const message = context.values.message?.trim() ?? "";
        if (!message) {
            throw new Error("Message content is required.");
        }

        const scheduledTime = parseScheduledTimeInput(context.values.time ?? "");
        if (!scheduledTime) {
            throw new Error("Enter a valid future time.");
        }

        const channelId = resolveChannelId(context.values.channel ?? "", context.selectedIds.channel ?? null);
        if (!channelId) {
            throw new Error("Select a valid channel.");
        }

        if (!await ensureScheduledMessagesPluginEnabled()) {
            throw new Error("ScheduledMessages plugin is unavailable.");
        }

        const result = await addScheduledMessage(channelId, message, scheduledTime);
        if (!result.success) {
            throw new Error(result.error ?? "Failed to schedule message.");
        }

        context.showSuccess("Message scheduled.");
    }
};

export default scheduledCreatePageSpec;
