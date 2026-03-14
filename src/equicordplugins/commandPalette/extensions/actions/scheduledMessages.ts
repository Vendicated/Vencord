/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { openViewScheduledModal } from "@equicordplugins/scheduledMessages/components/ViewScheduledModal";
import { Toasts } from "@webpack/common";

import { DEFAULT_CATEGORY_ID } from "../../metadata/categories";
import { TAG_NAVIGATION, TAG_PLUGINS, TAG_UTILITY } from "../../metadata/tags";
import type { CommandEntry } from "../../registry";
import { createCommandPageCommand } from "../../ui/pages/createCommandPageCommand";
import type { ScheduledMessagesPlugin } from "../types";

function showToast(message: string, type: (typeof Toasts.Type)[keyof typeof Toasts.Type]) {
    Toasts.show({ message, type, id: Toasts.genId(), options: { position: Toasts.Position.BOTTOM } });
}

function getScheduledMessagesPlugin(): ScheduledMessagesPlugin | null {
    const plugin = plugins.ScheduledMessages as ScheduledMessagesPlugin | undefined;
    return plugin ?? null;
}

async function ensureScheduledMessagesPluginEnabled() {
    const plugin = getScheduledMessagesPlugin();
    if (!plugin) {
        showToast("ScheduledMessages plugin is unavailable.", Toasts.Type.FAILURE);
        return false;
    }

    if (isPluginEnabled(plugin.name)) return true;

    const success = await toggleEnabled(plugin.name);
    if (!success || !isPluginEnabled(plugin.name)) {
        showToast("Failed to enable ScheduledMessages.", Toasts.Type.FAILURE);
        return false;
    }

    showToast("Enabled ScheduledMessages.", Toasts.Type.SUCCESS);
    return true;
}

async function runOpenScheduledMessages() {
    if (!await ensureScheduledMessagesPluginEnabled()) return;
    openViewScheduledModal();
}

export function createScheduledMessagesExtensionCommands(): CommandEntry[] {
    return [
        {
            id: "extension-scheduled-messages-open",
            label: "Open Scheduled Messages",
            description: "Open the ScheduledMessages modal.",
            keywords: ["scheduled", "messages", "schedule", "queue", "open", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY, TAG_NAVIGATION],
            handler: runOpenScheduledMessages
        },
        createCommandPageCommand({
            id: "extension-scheduled-messages-create",
            label: "Create Scheduled Message",
            description: "Create a scheduled message from separate fields.",
            keywords: ["create", "scheduled", "message", "channel", "time", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            page: { id: "scheduled-create" }
        }),
        {
            id: "extension-scheduled-messages-quick-schedule-query",
            label: "Quick Schedule",
            description: "Schedule a message from natural language input.",
            keywords: ["schedule", "message", "quick", "delay", "time", "channel", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            closeAfterExecute: true,
            queryTemplate: "schedule ",
            queryPlaceholder: "Message at time, optional channel",
            handler: () => undefined
        },
        {
            id: "extension-scheduled-messages-reschedule-query",
            label: "Reschedule Message",
            description: "Reschedule an existing queued message.",
            keywords: ["reschedule", "scheduled", "message", "queue", "time", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            closeAfterExecute: true,
            queryTemplate: "reschedule ",
            queryPlaceholder: "Select scheduled message, then new time",
            handler: () => undefined
        },
        {
            id: "extension-scheduled-messages-send-now-query",
            label: "Send Scheduled Message Now",
            description: "Send a queued scheduled message immediately.",
            keywords: ["send", "now", "scheduled", "message", "queue", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            closeAfterExecute: true,
            queryTemplate: "send now ",
            queryPlaceholder: "Select scheduled message",
            handler: () => undefined
        },
        {
            id: "extension-scheduled-messages-cancel-query",
            label: "Cancel Scheduled Message",
            description: "Cancel a queued scheduled message.",
            keywords: ["cancel", "delete", "remove", "scheduled", "message", "queue", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            closeAfterExecute: true,
            queryTemplate: "cancel scheduled ",
            queryPlaceholder: "Select scheduled message",
            handler: () => undefined
        }
    ];
}
