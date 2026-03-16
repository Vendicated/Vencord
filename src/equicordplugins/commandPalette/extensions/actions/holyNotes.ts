/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { noteHandler } from "@equicordplugins/holyNotes/NoteHandler";
import { Message } from "@vencord/discord-types";
import { MessageStore, SelectedChannelStore, Toasts } from "@webpack/common";

import { DEFAULT_CATEGORY_ID } from "../../metadata/categories";
import { TAG_NAVIGATION, TAG_PLUGINS, TAG_UTILITY } from "../../metadata/tags";
import type { CommandEntry } from "../../registry";
import type { HolyNotesPlugin } from "../types";

function showToast(message: string, type: (typeof Toasts.Type)[keyof typeof Toasts.Type]) {
    Toasts.show({ message, type, id: Toasts.genId(), options: { position: Toasts.Position.BOTTOM } });
}

function getHolyNotesPlugin(): HolyNotesPlugin | null {
    const plugin = plugins.HolyNotes as HolyNotesPlugin | undefined;
    return plugin ?? null;
}

async function ensureHolyNotesPluginEnabled() {
    const plugin = getHolyNotesPlugin();
    if (!plugin) {
        showToast("HolyNotes plugin is unavailable.", Toasts.Type.FAILURE);
        return false;
    }

    if (isPluginEnabled(plugin.name)) return true;

    const success = await toggleEnabled(plugin.name);
    if (!success || !isPluginEnabled(plugin.name)) {
        showToast("Failed to enable HolyNotes.", Toasts.Type.FAILURE);
        return false;
    }

    showToast("Enabled HolyNotes.", Toasts.Type.SUCCESS);
    return true;
}

async function runHolyNotesOpen() {
    if (!await ensureHolyNotesPluginEnabled()) return;

    const plugin = getHolyNotesPlugin();
    const openNotes = plugin?.toolboxActions?.["Open Notes"];
    if (typeof openNotes !== "function") {
        showToast("HolyNotes action is unavailable.", Toasts.Type.FAILURE);
        return;
    }

    await Promise.resolve(openNotes());
}

function getLastNonSystemMessageInChannel(channelId: string): Message | null {
    const messageCollection = MessageStore.getMessages?.(channelId) as { _array?: Message[]; } | undefined;
    const messages = messageCollection?._array;
    if (!messages?.length) return null;

    for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index] as Message & { deleted?: boolean; type?: number; };
        if (!message || message.deleted) continue;
        if (typeof message.type === "number" && message.type !== 0) continue;
        return message;
    }

    return null;
}

async function runHolyNotesQuickSaveLastMessage() {
    if (!await ensureHolyNotesPluginEnabled()) return;

    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) {
        showToast("No active channel available.", Toasts.Type.FAILURE);
        return;
    }

    const message = getLastNonSystemMessageInChannel(channelId);
    if (!message) {
        showToast("No message available to save.", Toasts.Type.MESSAGE);
        return;
    }

    noteHandler.addNote(message, "Main");
}

export function createHolyNotesExtensionCommands(): CommandEntry[] {
    return [
        {
            id: "extension-holy-notes-open",
            label: "Open Notes",
            description: "Open the HolyNotes notebook modal.",
            keywords: ["holy", "notes", "notebook", "bookmark", "open", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY, TAG_NAVIGATION],
            handler: runHolyNotesOpen
        },
        {
            id: "extension-holy-notes-create-notebook-query",
            label: "Create Notebook",
            description: "Create a HolyNotes notebook.",
            keywords: ["holy", "notes", "notebook", "create", "new", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            closeAfterExecute: true,
            queryTemplate: "create notebook ",
            queryPlaceholder: "Notebook name",
            handler: () => undefined
        },
        {
            id: "extension-holy-notes-delete-notebook-query",
            label: "Delete Notebook",
            description: "Delete a HolyNotes notebook.",
            keywords: ["holy", "notes", "notebook", "delete", "remove", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            closeAfterExecute: true,
            queryTemplate: "delete notebook ",
            queryPlaceholder: "Notebook name",
            handler: () => undefined
        },
        {
            id: "extension-holy-notes-move-note-query",
            label: "Move Note",
            description: "Move a HolyNotes note to another notebook.",
            keywords: ["holy", "notes", "note", "move", "notebook", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            closeAfterExecute: true,
            queryTemplate: "move note ",
            queryPlaceholder: "Find note by content, then destination",
            handler: () => undefined
        },
        {
            id: "extension-holy-notes-jump-note-query",
            label: "Jump To Note",
            description: "Jump to the original message for a HolyNotes note.",
            keywords: ["holy", "notes", "jump", "note", "message", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_NAVIGATION],
            closeAfterExecute: true,
            queryTemplate: "jump to note ",
            queryPlaceholder: "Search note content",
            handler: () => undefined
        },
        {
            id: "extension-holy-notes-quick-save-last-message",
            label: "Quick Save Last Message",
            description: "Save the latest message in this channel to Main.",
            keywords: ["holy", "notes", "save", "last", "message", "bookmark", "main", "plugin", "extension"],
            categoryId: DEFAULT_CATEGORY_ID,
            tags: [TAG_PLUGINS, TAG_UTILITY],
            handler: runHolyNotesQuickSaveLastMessage
        }
    ];
}
