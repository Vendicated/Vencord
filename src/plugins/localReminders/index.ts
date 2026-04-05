/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import * as DataStore from "@api/DataStore";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const logger = new Logger("LocalReminders");
const DATA_KEY = "LocalReminders_v1";
/** Max delay so `setTimeout` stays within engine limits (~24.8 days). */
const MAX_MINUTES = 60 * 24 * 20;
const DEFAULT_MAX_ACTIVE = 50;

interface Reminder {
    id: string;
    fireAt: number;
    message: string;
    createdAt: number;
}

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

const settings = definePluginSettings({
    maxReminders: {
        type: OptionType.NUMBER,
        description: "Maximum number of pending reminders at once",
        default: DEFAULT_MAX_ACTIVE,
    },
});

async function loadReminders(): Promise<Reminder[]> {
    return (await DataStore.get<Reminder[]>(DATA_KEY)) ?? [];
}

async function saveReminders(list: Reminder[]) {
    await DataStore.set(DATA_KEY, list);
}

function clearSchedule(id: string) {
    const handle = activeTimers.get(id);
    if (handle !== undefined) {
        clearTimeout(handle);
        activeTimers.delete(id);
    }
}

function scheduleReminder(r: Reminder) {
    clearSchedule(r.id);
    const delay = Math.max(0, r.fireAt - Date.now());
    const handle = setTimeout(() => {
        activeTimers.delete(r.id);
        void fireReminder(r.id);
    }, delay);
    activeTimers.set(r.id, handle);
}

async function fireReminder(id: string) {
    try {
        const list = await loadReminders();
        const r = list.find(x => x.id === id);
        if (!r) return;

        const next = list.filter(x => x.id !== id);
        await saveReminders(next);

        const overdue = Date.now() - r.fireAt > 60_000;
        await showNotification({
            title: overdue ? "Reminder (overdue)" : "Reminder",
            body: r.message,
            noPersist: true,
        });
    } catch (e) {
        logger.error("Failed to fire reminder", id, e);
    }
}

async function rescheduleAll() {
    for (const h of activeTimers.values()) clearTimeout(h);
    activeTimers.clear();

    const list = await loadReminders();
    const now = Date.now();
    const pending: Reminder[] = [];

    for (const r of list) {
        if (r.fireAt <= now) {
            await showNotification({
                title: "Reminder (missed while offline)",
                body: r.message,
                noPersist: true,
            });
        } else {
            pending.push(r);
        }
    }

    if (pending.length !== list.length) await saveReminders(pending);

    for (const r of pending) scheduleReminder(r);
}

async function addReminder(minutes: number, message: string, channelId: string) {
    const list = await loadReminders();
    const max = Math.max(1, Math.floor(settings.store.maxReminders));
    if (list.length >= max) {
        sendBotMessage(channelId, {
            content: `You already have ${max} pending reminders. Cancel some with \`/remind cancel\` or raise the limit in plugin settings.`,
        });
        return;
    }

    const fireAt = Date.now() + minutes * 60_000;
    const r: Reminder = {
        id: crypto.randomUUID(),
        fireAt,
        message,
        createdAt: Date.now(),
    };

    await saveReminders([...list, r]);
    scheduleReminder(r);

    sendBotMessage(channelId, {
        content: `Reminder set for <t:${Math.floor(fireAt / 1000)}:F> (<t:${Math.floor(fireAt / 1000)}:R>). Id: \`${r.id.slice(0, 8)}\``,
    });
}

async function listReminders(channelId: string) {
    const list = (await loadReminders()).sort((a, b) => a.fireAt - b.fireAt);
    if (!list.length) {
        sendBotMessage(channelId, { content: "No pending reminders." });
        return;
    }

    const lines = list.map(
        r =>
            `\`${r.id.slice(0, 8)}\` · <t:${Math.floor(r.fireAt / 1000)}:R> — ${r.message.slice(0, 120)}${r.message.length > 120 ? "…" : ""}`,
    );
    sendBotMessage(channelId, { content: lines.join("\n") });
}

async function cancelReminder(rawId: string, channelId: string) {
    const needle = rawId.trim().toLowerCase();
    if (!needle) {
        sendBotMessage(channelId, { content: "Pass a reminder id (from `/remind list`)." });
        return;
    }

    const list = await loadReminders();
    const matches = list.filter(r => r.id === needle || r.id.toLowerCase().startsWith(needle));

    if (matches.length === 0) {
        sendBotMessage(channelId, { content: "No reminder matches that id." });
        return;
    }
    if (matches.length > 1) {
        sendBotMessage(channelId, {
            content: "That prefix matches multiple reminders; paste more characters of the id.",
        });
        return;
    }

    const [removed] = matches;
    await saveReminders(list.filter(r => r.id !== removed.id));
    clearSchedule(removed.id);
    sendBotMessage(channelId, { content: `Cancelled reminder \`${removed.id.slice(0, 8)}\`.` });
}

export default definePlugin({
    name: "LocalReminders",
    description: "Local-only reminders with /remind — stored on this device, survives Discord restart",
    authors: [{ name: "youtsuho", id: 1393019545522012271n }],
    settings,

    start() {
        void rescheduleAll();
    },

    stop() {
        for (const h of activeTimers.values()) clearTimeout(h);
        activeTimers.clear();
    },

    commands: [
        {
            name: "remind",
            description: "Set and manage local reminders (this device only)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "in",
                    description: "Remind after a number of minutes",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "minutes",
                            description: `Minutes from now (1–${MAX_MINUTES})`,
                            type: ApplicationCommandOptionType.INTEGER,
                            required: true,
                        },
                        {
                            name: "message",
                            description: "What to remind you about",
                            type: ApplicationCommandOptionType.STRING,
                            required: true,
                        },
                    ],
                },
                {
                    name: "list",
                    description: "List pending reminders",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [],
                },
                {
                    name: "cancel",
                    description: "Cancel a reminder by id (first 8 characters of the uuid is enough if unique)",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "id",
                            description: "Reminder id from /remind list",
                            type: ApplicationCommandOptionType.STRING,
                            required: true,
                        },
                    ],
                },
            ],

            async execute(args, ctx) {
                const sub = args[0];
                switch (sub.name) {
                    case "in": {
                        const rawMinutes = findOption(sub.options ?? [], "minutes", 0);
                        const minutes = typeof rawMinutes === "number" ? rawMinutes : Number(rawMinutes);
                        let message = findOption(sub.options ?? [], "message", "").trim();
                        if (!Number.isFinite(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
                            sendBotMessage(ctx.channel.id, {
                                content: `Minutes must be between 1 and ${MAX_MINUTES}.`,
                            });
                            return;
                        }
                        if (!message) {
                            sendBotMessage(ctx.channel.id, { content: "Message cannot be empty." });
                            return;
                        }
                        if (message.length > 500) message = message.slice(0, 500);
                        await addReminder(minutes, message, ctx.channel.id);
                        break;
                    }
                    case "list":
                        await listReminders(ctx.channel.id);
                        break;
                    case "cancel": {
                        const id = findOption(sub.options ?? [], "id", "");
                        await cancelReminder(id, ctx.channel.id);
                        break;
                    }
                }
            },
        },
    ],
});
