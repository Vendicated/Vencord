/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { NotesIcon } from "@components/Icons";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { noteHandler } from "@equicordplugins/holyNotes/NoteHandler";
import type { Note } from "@equicordplugins/holyNotes/types";
import type { ScheduledMessage } from "@equicordplugins/scheduledMessages/types";
import { addScheduledMessage, getChannelDisplayInfo, getScheduledMessages, removeScheduledMessage, sendScheduledMessageNow, updateScheduledMessageTime } from "@equicordplugins/scheduledMessages/utils";
import { sleep } from "@utils/misc";
import { ChannelActionCreators, ChannelStore, NavigationRouter, SelectedChannelStore, Toasts, UserStore } from "@webpack/common";

import { parseQuery } from "../query/parser";
import { pluginToggleVerb, resolveAllChannels, resolveChannels, resolveGuilds, resolvePlugins, resolveRecentDmUsers, resolveSettingsCommandIds, resolveUsers } from "../query/resolvers";
import type { QueryActionCandidate, QueryResolution } from "../query/types";
import { DISCORD_INTERNAL_HOSTS, executeCommand, getCommandById } from "../registry";
import { makeIconFromUrl } from "../ui/iconFromUrl";
import { sendMessageToChannel, sendMessageToUser } from "./sendMessageAction";

interface ResolvedHolyNote {
    notebook: string;
    note: Note;
}

interface StagedRescheduledMessage {
    id: string;
    label: string;
}

let stagedMoveNote: ResolvedHolyNote | null = null;
let stagedRescheduleMessage: StagedRescheduledMessage | null = null;
let pendingCancelScheduledMessageId: string | null = null;

async function ensureHolyNotesEnabled() {
    const plugin = plugins.HolyNotes;
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

    return true;
}

async function ensureScheduledMessagesEnabled() {
    const plugin = plugins.ScheduledMessages;
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

    return true;
}

function showToast(message: string, type: (typeof Toasts.Type)[keyof typeof Toasts.Type]) {
    Toasts.show({
        message,
        type,
        id: Toasts.genId(),
        options: { position: Toasts.Position.BOTTOM }
    });
}

function openExternalUrl(url: string) {
    const external = (window as Window & { DiscordNative?: { app?: { openExternalURL?(url: string): void; }; }; }).DiscordNative?.app?.openExternalURL;
    if (typeof external === "function") {
        external(url);
        return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
}

function toDiscordRoute(url: URL): string | null {
    const host = url.hostname.toLowerCase();
    if (!DISCORD_INTERNAL_HOSTS.has(host)) return null;

    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/") ? path : `/${path}`;
}

function normalizeUrl(input: string): URL | null {
    try {
        return new URL(input);
    } catch {
        try {
            return new URL(`https://${input}`);
        } catch {
            return null;
        }
    }
}

function isSafeUrlProtocol(url: URL): boolean {
    return url.protocol === "http:" || url.protocol === "https:";
}

function isDirectMessageChannelForUser(channelId: string, userId: string): boolean {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return false;

    const isDm = typeof channel.isDM === "function" ? channel.isDM() : channel.type === 1;
    if (!isDm) return false;

    const recipientId = channel.recipients?.[0];
    return recipientId === userId;
}

function findDirectMessageChannelForUser(userId: string): string | null {
    const sortedPrivateChannels = (ChannelStore as {
        getSortedPrivateChannels?(): Array<string | { id?: string; channelId?: string; }>;
    }).getSortedPrivateChannels?.() ?? [];

    for (const raw of sortedPrivateChannels) {
        const channelId = typeof raw === "string" ? raw : raw?.id ?? raw?.channelId ?? null;
        if (!channelId) continue;
        if (isDirectMessageChannelForUser(channelId, userId)) return channelId;
    }

    return null;
}

async function openDmByUserId(userId: string): Promise<string | null> {
    const currentUserId = UserStore.getCurrentUser?.()?.id;
    if (currentUserId && userId === currentUserId) return null;

    try {
        await Promise.resolve(ChannelActionCreators.openPrivateChannel?.({
            recipientIds: [userId],
            location: "CommandPalette",
            navigateToChannel: false
        }));
    } catch {
        return null;
    }

    const started = Date.now();
    while (Date.now() - started <= 2500) {
        const channelId = ChannelStore.getDMFromUserId?.(userId) ?? null;
        if (channelId && isDirectMessageChannelForUser(channelId, userId)) return channelId;

        const fallback = findDirectMessageChannelForUser(userId);
        if (fallback) return fallback;

        await sleep(80);
    }

    return null;
}

function buildSendCandidates(target: string, content: string, useFilePicker: boolean, silent: boolean): QueryActionCandidate[] {
    const matches = resolveUsers(target);
    if (matches.length === 0) {
        return [{
            id: "query-send-invalid",
            label: "Send message",
            description: "No matching user found.",
            badge: "Query",
            icon: NotesIcon,
            run: () => showToast("No matching user found.", Toasts.Type.FAILURE)
        }];
    }

    const candidates = matches.slice(0, 5).map(match => ({
        id: `query-send-${match.user.id}`,
        label: `Send message to ${match.display}`,
        description: "Direct message",
        inputPreview: content,
        badge: "Query",
        icon: makeIconFromUrl(match.iconUrl) ?? NotesIcon,
        run: async () => {
            await sendMessageToUser({
                userId: match.user.id,
                content,
                useFilePicker,
                silent
            });
            showToast(`Message sent to ${match.display}.`, Toasts.Type.SUCCESS);
        }
    } satisfies QueryActionCandidate));

    return candidates;
}

function buildSendChannelCandidates(target: string, content: string, useFilePicker: boolean, silent: boolean): QueryActionCandidate[] {
    const matches = resolveChannels(target).slice(0, 5);
    if (matches.length === 0) {
        return [{
            id: "query-send-channel-invalid",
            label: "Send to channel",
            description: "No matching channel found.",
            badge: "Query",
            icon: NotesIcon,
            run: () => showToast("No matching channel found.", Toasts.Type.FAILURE)
        }];
    }

    return matches.map(match => ({
        id: `query-send-channel-${match.id}`,
        label: `Send to ${match.display}`,
        description: "Channel message",
        inputPreview: content,
        badge: "Query",
        icon: makeIconFromUrl(match.iconUrl) ?? NotesIcon,
        run: async () => {
            await sendMessageToChannel({
                channelId: match.id,
                content,
                useFilePicker,
                silent
            });
            showToast(`Message sent to ${match.display}.`, Toasts.Type.SUCCESS);
        }
    }));
}

function buildOpenDmCandidates(target: string): QueryActionCandidate[] {
    const trimmedTarget = target.trim();
    const currentUserId = UserStore.getCurrentUser?.()?.id;
    const matches = (trimmedTarget ? resolveUsers(trimmedTarget) : resolveRecentDmUsers(40))
        .filter(match => !currentUserId || match.user.id !== currentUserId);
    if (matches.length === 0) {
        return [{
            id: "query-open-dm-invalid",
            label: "Open DM",
            description: trimmedTarget ? "No matching user found." : "No recent DMs found.",
            badge: "Query",
            run: () => showToast(trimmedTarget ? "No matching user found." : "No recent DMs found.", Toasts.Type.FAILURE)
        }];
    }

    return matches.slice(0, 24).map(match => ({
        id: `query-open-dm-${match.user.id}`,
        label: match.display,
        description: "Direct message",
        badge: "Query",
        icon: makeIconFromUrl(match.iconUrl) ?? NotesIcon,
        iconUrl: match.iconUrl,
        suggestionKind: "user",
        run: async () => {
            const dmId = await openDmByUserId(match.user.id);
            if (!dmId) {
                showToast("Unable to open DM.", Toasts.Type.FAILURE);
                return;
            }

            NavigationRouter.transitionTo(`/channels/@me/${dmId}`);
        }
    }));
}

function buildGoToCandidates(target: string): QueryActionCandidate[] {
    const trimmedTarget = target.trim();
    const guilds = resolveGuilds(trimmedTarget, { includeAllWhenEmpty: true }).slice(0, 24);
    const candidates: QueryActionCandidate[] = [];

    for (const guild of guilds) {
        candidates.push({
            id: `query-go-guild-${guild.id}`,
            label: guild.display,
            badge: "Query",
            icon: makeIconFromUrl(guild.iconUrl),
            iconUrl: guild.iconUrl,
            suggestionKind: "guild",
            run: () => NavigationRouter.transitionToGuild(guild.id)
        });
    }

    if (candidates.length > 0) return candidates;

    return [{
        id: "query-go-invalid",
        label: "Navigate to",
        description: "No server matches that target.",
        badge: "Query",
        run: () => showToast("No server matches that target.", Toasts.Type.FAILURE)
    }];
}

function buildOpenSettingsCandidates(target: string): QueryActionCandidate[] {
    const commandIds = resolveSettingsCommandIds(target).slice(0, 4);
    if (commandIds.length === 0) {
        return [{
            id: "query-settings-invalid",
            label: "Open settings",
            description: "No matching settings section.",
            badge: "Query",
            run: () => showToast("No matching settings section.", Toasts.Type.FAILURE)
        }];
    }

    return commandIds.map(commandId => {
        const entry = getCommandById(commandId);
        if (!entry) {
            return {
                id: `query-settings-missing-${commandId}`,
                label: "Open settings",
                description: "Settings command is unavailable.",
                badge: "Query",
                run: () => showToast("Settings command is unavailable.", Toasts.Type.FAILURE)
            } satisfies QueryActionCandidate;
        }

        return {
            id: `query-settings-${commandId}`,
            label: entry.label,
            description: entry.description,
            badge: "Query",
            run: async () => {
                await executeCommand(entry);
            }
        } satisfies QueryActionCandidate;
    });
}

function buildTogglePluginCandidates(target: string): QueryActionCandidate[] {
    const matches = resolvePlugins(target).slice(0, 5);
    if (matches.length === 0) {
        return [{
            id: "query-toggle-plugin-invalid",
            label: "Toggle plugin",
            description: "No matching plugin.",
            badge: "Query",
            run: () => showToast("No matching plugin.", Toasts.Type.FAILURE)
        }];
    }

    return matches.map(plugin => ({
        id: `query-toggle-plugin-${plugin.name}`,
        label: `${pluginToggleVerb(plugin)} ${plugin.name}`,
        description: plugin.description,
        badge: "Query",
        run: async () => {
            const before = isPluginEnabled(plugin.name);
            const success = await toggleEnabled(plugin.name);
            const after = isPluginEnabled(plugin.name);

            if (!success) {
                showToast(`Failed to toggle ${plugin.name}.`, Toasts.Type.FAILURE);
                return;
            }

            if (before !== after) {
                showToast(`${after ? "Enabled" : "Disabled"} ${plugin.name}.`, Toasts.Type.SUCCESS);
                return;
            }

            showToast(`No change for ${plugin.name}.`, Toasts.Type.MESSAGE);
        }
    }));
}

function buildOpenUrlCandidates(target: string): QueryActionCandidate[] {
    const parsed = normalizeUrl(target);
    if (!parsed || !isSafeUrlProtocol(parsed)) {
        return [{
            id: "query-open-url-invalid",
            label: "Open URL",
            description: "Invalid URL.",
            badge: "Query",
            run: () => showToast("Invalid URL.", Toasts.Type.FAILURE)
        }];
    }

    const href = parsed.toString();
    return [{
        id: `query-open-url-${href}`,
        label: `Open ${href}`,
        badge: "Query",
        run: () => {
            const route = toDiscordRoute(parsed);
            if (route) {
                NavigationRouter.transitionTo(route);
                return;
            }

            openExternalUrl(href);
        }
    }];
}

function normalizeText(value: string): string {
    return value.trim().toLowerCase();
}

function formatScheduledTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
}

function toScheduledSnippet(content: string): string {
    const normalized = content.replace(/\s+/g, " ").trim();
    if (!normalized) return "(No text)";
    if (normalized.length <= 56) return normalized;
    return `${normalized.slice(0, 53)}...`;
}

function toScheduledMessageLabel(message: ScheduledMessage): string {
    const channel = getChannelDisplayInfo(message.channelId);
    const snippet = toScheduledSnippet(message.content);
    return `${channel.name} · ${snippet} · ${formatScheduledTime(message.scheduledTime)}`;
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

    const lower = normalized.toLowerCase();
    const now = Date.now();

    const relative = lower.match(/^in\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/);
    if (relative) {
        const amount = Number.parseInt(relative[1], 10);
        if (amount < 1) return null;

        const unit = relative[2];
        const multiplier = unit.startsWith("m")
            ? 60_000
            : unit.startsWith("h")
                ? 3_600_000
                : 86_400_000;
        return now + amount * multiplier;
    }

    const tomorrow = lower.match(/^tomorrow(?:\s+at)?\s+(.+)$/);
    if (tomorrow?.[1]) {
        const base = new Date();
        base.setDate(base.getDate() + 1);
        return parseClockToken(tomorrow[1], base);
    }

    const today = lower.match(/^today(?:\s+at)?\s+(.+)$/);
    if (today?.[1]) {
        const timestamp = parseClockToken(today[1], new Date());
        return timestamp && timestamp > now ? timestamp : null;
    }

    const clockOnly = parseClockToken(normalized, new Date());
    if (clockOnly) {
        if (clockOnly > now) return clockOnly;
        return clockOnly + 86_400_000;
    }

    const numericDate = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[ t](\d{1,2}:\d{2}(?:\s*(?:am|pm))?))?$/i);
    if (numericDate) {
        if (numericDate[2]) {
            const [year, month, day] = numericDate[1].split("-").map(part => Number.parseInt(part, 10));
            const base = new Date(year, month - 1, day);
            return parseClockToken(numericDate[2], base);
        }

        const dateOnly = new Date(`${numericDate[1]}T09:00:00`);
        const timestamp = dateOnly.getTime();
        if (Number.isNaN(timestamp) || timestamp <= now) return null;
        return timestamp;
    }

    const parsed = new Date(normalized).getTime();
    if (!Number.isNaN(parsed) && parsed > now) return parsed;
    return null;
}

function parseQuickScheduleTarget(target: string): { message: string; timeInput: string; channelTarget: string | null; } | null {
    const normalized = target.trim();
    if (!normalized) return null;

    const split = normalized.match(/^(.*)\s(?:at|in)\s(.+)$/i);
    if (!split?.[1] || !split[2]) return null;

    let message = split[1].trim();
    let timeInput = split[2].trim();
    let channelTarget: string | null = null;

    const withDestination = timeInput.match(/^(.*)\s+to\s+(.+)$/i);
    if (withDestination?.[1] && withDestination[2]) {
        timeInput = withDestination[1].trim();
        channelTarget = withDestination[2].trim();
    }

    const prefixedDestination = message.match(/^to\s+(.+?)\s+(.+)$/i);
    if (prefixedDestination?.[1] && prefixedDestination[2] && !channelTarget) {
        channelTarget = prefixedDestination[1].trim();
        message = prefixedDestination[2].trim();
    }

    if (!message || !timeInput) return null;
    return { message, timeInput, channelTarget };
}

function resolveChannelChoice(target: string | null): { id: string; display: string; } | null {
    const normalized = target?.trim() ?? "";
    if (normalized) {
        const matches = resolveAllChannels(normalized);
        if (matches.length > 0) return { id: matches[0].id, display: matches[0].display };
        return null;
    }

    const currentChannelId = SelectedChannelStore.getChannelId();
    if (!currentChannelId) return null;
    const channel = ChannelStore.getChannel(currentChannelId);
    if (!channel) return null;

    const display = channel.name ? `#${channel.name}` : getChannelDisplayInfo(currentChannelId).name;
    return { id: currentChannelId, display };
}

function filterScheduledMessages(target: string): ScheduledMessage[] {
    const query = normalizeText(target);
    const messages = getScheduledMessages();
    if (!query) return messages;

    return messages.filter(message => {
        const channel = getChannelDisplayInfo(message.channelId).name.toLowerCase();
        const content = message.content.toLowerCase();
        const time = formatScheduledTime(message.scheduledTime).toLowerCase();
        return channel.includes(query) || content.includes(query) || time.includes(query);
    });
}

function getNotebookNames(): string[] {
    return Object.keys(noteHandler.getAllNotes());
}

function filterNotebookNames(target: string, includeMain: boolean): string[] {
    const normalizedTarget = normalizeText(target);
    return getNotebookNames()
        .filter(notebook => includeMain || notebook !== "Main")
        .filter(notebook => !normalizedTarget || notebook.toLowerCase().includes(normalizedTarget))
        .sort((left, right) => left.localeCompare(right));
}

function getResolvedNotes(target: string): ResolvedHolyNote[] {
    const normalizedTarget = normalizeText(target);
    const notebooks = noteHandler.getAllNotes();
    const resolved: ResolvedHolyNote[] = [];

    for (const [notebook, notes] of Object.entries(notebooks)) {
        for (const note of Object.values(notes)) {
            const content = note.content?.trim() ?? "";
            if (normalizedTarget && !content.toLowerCase().includes(normalizedTarget)) continue;
            resolved.push({ notebook, note });
        }
    }

    return resolved;
}

function toNoteSnippet(note: Note): string {
    const content = note.content?.replace(/\s+/g, " ").trim();
    if (!content) return "(No text)";
    if (content.length <= 56) return content;
    return `${content.slice(0, 53)}...`;
}

function buildCreateNotebookCandidates(target: string): QueryActionCandidate[] {
    const notebookName = target.trim();
    if (!notebookName) {
        return [{
            id: "query-create-notebook-invalid",
            label: "Create notebook",
            description: "Notebook name is required.",
            badge: "Query",
            icon: NotesIcon,
            run: () => {
                showToast("Notebook name is required.", Toasts.Type.FAILURE);
                return false;
            }
        }];
    }

    return [{
        id: `query-create-notebook-${notebookName.toLowerCase()}`,
        label: `Create notebook ${notebookName}`,
        badge: "Query",
        icon: NotesIcon,
        run: async () => {
            if (!await ensureHolyNotesEnabled()) return false;
            if (noteHandler.getNotes(notebookName)) {
                showToast(`Notebook ${notebookName} already exists`, Toasts.Type.FAILURE);
                return false;
            }
            noteHandler.newNoteBook(notebookName);
        }
    }];
}

function buildDeleteNotebookCandidates(target: string): QueryActionCandidate[] {
    const notebooks = filterNotebookNames(target, false);
    if (notebooks.length === 0) {
        return [{
            id: "query-delete-notebook-none",
            label: "Delete notebook",
            description: "No deletable notebook found.",
            badge: "Query",
            icon: NotesIcon,
            run: () => {
                showToast("No deletable notebook found.", Toasts.Type.MESSAGE);
                return false;
            }
        }];
    }

    return notebooks.slice(0, 8).map(notebook => ({
        id: `query-delete-notebook-${notebook.toLowerCase()}`,
        label: notebook,
        description: "Notebook",
        badge: "Query",
        icon: NotesIcon,
        run: async () => {
            if (!await ensureHolyNotesEnabled()) return false;
            noteHandler.deleteNotebook(notebook);
        }
    }));
}

function buildJumpNoteCandidates(target: string): QueryActionCandidate[] {
    const notes = getResolvedNotes(target).slice(0, 10);
    if (notes.length === 0) {
        return [{
            id: "query-jump-note-none",
            label: "Jump to note",
            description: "No matching note found.",
            badge: "Query",
            icon: NotesIcon,
            run: () => {
                showToast("No matching note found.", Toasts.Type.FAILURE);
                return false;
            }
        }];
    }

    return notes.map(({ notebook, note }) => ({
        id: `query-jump-note-${notebook}-${note.id}`,
        label: `[${notebook}] ${toNoteSnippet(note)}`,
        description: "Open original message.",
        badge: "Query",
        icon: NotesIcon,
        run: async () => {
            if (!await ensureHolyNotesEnabled()) return false;
            NavigationRouter.transitionTo(`/channels/${note.guild_id || "@me"}/${note.channel_id}/${note.id}`);
        }
    }));
}

function buildMoveNoteCandidates(target: string): QueryActionCandidate[] {
    if (stagedMoveNote) {
        const destinationNotebooks = filterNotebookNames(target, true)
            .filter(notebook => notebook !== stagedMoveNote?.notebook);

        if (destinationNotebooks.length === 0) {
            return [{
                id: "query-move-note-no-destination",
                label: "Move note",
                description: "No destination notebook found.",
                badge: "Query",
                icon: NotesIcon,
                run: () => {
                    showToast("No destination notebook found.", Toasts.Type.FAILURE);
                    return false;
                }
            }];
        }

        return destinationNotebooks.slice(0, 8).map(destinationNotebook => ({
            id: `query-move-note-destination-${destinationNotebook.toLowerCase()}`,
            label: `[${stagedMoveNote!.notebook}] ${toNoteSnippet(stagedMoveNote!.note)} -> Move to ${destinationNotebook}`,
            description: "Move note",
            badge: "Query",
            icon: NotesIcon,
            run: async () => {
                if (!stagedMoveNote) return;
                if (!await ensureHolyNotesEnabled()) return false;
                if (!stagedMoveNote) return;
                noteHandler.moveNote(stagedMoveNote.note, stagedMoveNote.notebook, destinationNotebook);
                stagedMoveNote = null;
            }
        }));
    }

    const notes = getResolvedNotes(target).slice(0, 10);
    if (notes.length === 0) {
        return [{
            id: "query-move-note-none",
            label: "Move note",
            description: "No matching note found.",
            badge: "Query",
            icon: NotesIcon,
            run: () => {
                showToast("No matching note found.", Toasts.Type.FAILURE);
                return false;
            }
        }];
    }

    return notes.map(({ notebook, note }) => ({
        id: `query-move-note-select-${notebook}-${note.id}`,
        label: `[${notebook}] ${toNoteSnippet(note)}`,
        description: "Select destination notebook.",
        badge: "Query",
        icon: NotesIcon,
        run: () => {
            return ensureHolyNotesEnabled().then(enabled => {
                if (!enabled) return false;
                stagedMoveNote = { notebook, note };
                showToast("Note selected. Choose destination notebook.", Toasts.Type.MESSAGE);
                return false;
            });
        }
    }));
}

function buildQuickScheduleMessageCandidates(target: string): QueryActionCandidate[] {
    const parsed = parseQuickScheduleTarget(target);
    if (!parsed) return [];

    const channelChoice = resolveChannelChoice(parsed.channelTarget);
    if (!channelChoice) return [];

    const scheduledTime = parseScheduledTimeInput(parsed.timeInput);
    if (!scheduledTime) return [];

    const label = `${channelChoice.display} · ${toScheduledSnippet(parsed.message)} · ${formatScheduledTime(scheduledTime)}`;
    return [{
        id: `query-schedule-message-${channelChoice.id}-${scheduledTime}`,
        label,
        description: "Schedule message",
        badge: "Query",
        run: async () => {
            if (!await ensureScheduledMessagesEnabled()) return false;
            const result = await addScheduledMessage(channelChoice.id, parsed.message, scheduledTime);
            if (!result.success) {
                showToast(result.error ?? "Failed to schedule message.", Toasts.Type.FAILURE);
                return false;
            }
            showToast("Message scheduled.", Toasts.Type.SUCCESS);
        }
    }];
}

function buildRescheduleMessageCandidates(target: string): QueryActionCandidate[] {
    if (!stagedRescheduleMessage) {
        const messages = filterScheduledMessages(target).slice(0, 12);
        if (messages.length === 0) {
            return [{
                id: "query-reschedule-none",
                label: "Reschedule message",
                description: "No scheduled messages found.",
                badge: "Query",
                run: () => {
                    showToast("No scheduled messages found.", Toasts.Type.MESSAGE);
                    return false;
                }
            }];
        }

        return messages.map(message => {
            const label = toScheduledMessageLabel(message);
            return {
                id: `query-reschedule-select-${message.id}`,
                label,
                description: "Select message to reschedule.",
                badge: "Query",
                run: () => {
                    stagedRescheduleMessage = { id: message.id, label };
                    showToast("Message selected. Type the new schedule time.", Toasts.Type.MESSAGE);
                    return false;
                }
            };
        });
    }

    const scheduledTime = parseScheduledTimeInput(target);
    if (!scheduledTime) {
        return [{
            id: "query-reschedule-time-invalid",
            label: stagedRescheduleMessage.label,
            description: "Use in 10m, tomorrow 5pm, or 2026-02-14 18:00.",
            badge: "Query",
            run: () => {
                showToast("Type a valid future time.", Toasts.Type.MESSAGE);
                return false;
            }
        }];
    }

    return [{
        id: `query-reschedule-apply-${stagedRescheduleMessage.id}-${scheduledTime}`,
        label: `${stagedRescheduleMessage.label} -> ${formatScheduledTime(scheduledTime)}`,
        description: "Apply new schedule time.",
        badge: "Query",
        run: async () => {
            if (!await ensureScheduledMessagesEnabled()) return false;
            const result = await updateScheduledMessageTime(stagedRescheduleMessage!.id, scheduledTime);
            if (!result.success) {
                showToast(result.error ?? "Failed to reschedule message.", Toasts.Type.FAILURE);
                return false;
            }
            stagedRescheduleMessage = null;
            showToast("Message rescheduled.", Toasts.Type.SUCCESS);
        }
    }];
}

function buildSendScheduledNowCandidates(target: string): QueryActionCandidate[] {
    const messages = filterScheduledMessages(target).slice(0, 12);
    if (messages.length === 0) {
        return [{
            id: "query-send-scheduled-none",
            label: "Send scheduled message now",
            description: "No scheduled messages found.",
            badge: "Query",
            run: () => {
                showToast("No scheduled messages found.", Toasts.Type.MESSAGE);
                return false;
            }
        }];
    }

    return messages.map(message => ({
        id: `query-send-scheduled-${message.id}`,
        label: toScheduledMessageLabel(message),
        description: "Send now.",
        badge: "Query",
        run: async () => {
            if (!await ensureScheduledMessagesEnabled()) return false;
            const result = await sendScheduledMessageNow(message.id);
            if (!result.success) {
                showToast(result.error ?? "Failed to send scheduled message.", Toasts.Type.FAILURE);
                return false;
            }
            showToast("Sent scheduled message.", Toasts.Type.SUCCESS);
        }
    }));
}

function buildCancelScheduledMessageCandidates(target: string): QueryActionCandidate[] {
    if (pendingCancelScheduledMessageId) {
        const message = getScheduledMessages().find(entry => entry.id === pendingCancelScheduledMessageId);
        if (!message) {
            pendingCancelScheduledMessageId = null;
        } else {
            return [{
                id: `query-cancel-scheduled-confirm-${message.id}`,
                label: `Confirm cancel · ${toScheduledMessageLabel(message)}`,
                description: "Confirm removal.",
                badge: "Query",
                run: async () => {
                    if (!await ensureScheduledMessagesEnabled()) return false;
                    await removeScheduledMessage(message.id);
                    pendingCancelScheduledMessageId = null;
                    showToast("Scheduled message canceled.", Toasts.Type.SUCCESS);
                }
            }];
        }
    }

    const messages = filterScheduledMessages(target).slice(0, 12);
    if (messages.length === 0) {
        return [{
            id: "query-cancel-scheduled-none",
            label: "Cancel scheduled message",
            description: "No scheduled messages found.",
            badge: "Query",
            run: () => {
                showToast("No scheduled messages found.", Toasts.Type.MESSAGE);
                return false;
            }
        }];
    }

    return messages.map(message => ({
        id: `query-cancel-scheduled-pick-${message.id}`,
        label: toScheduledMessageLabel(message),
        description: "Select to confirm cancel.",
        badge: "Query",
        run: () => {
            pendingCancelScheduledMessageId = message.id;
            showToast("Select again to confirm cancel.", Toasts.Type.MESSAGE);
            return false;
        }
    }));
}

export function buildQueryResolution(query: string): QueryResolution {
    const parsed = parseQuery(query);
    if (!parsed) {
        stagedMoveNote = null;
        stagedRescheduleMessage = null;
        pendingCancelScheduledMessageId = null;
        return { type: "none" };
    }

    if (parsed.intent !== "move_note") {
        stagedMoveNote = null;
    }
    if (parsed.intent !== "reschedule_message") {
        stagedRescheduleMessage = null;
    }
    if (parsed.intent !== "cancel_scheduled_message") {
        pendingCancelScheduledMessageId = null;
    }

    switch (parsed.intent) {
        case "send_message": {
            if (!parsed.content) {
                return { type: "invalid", reason: "Message content is required." };
            }
            return {
                type: "candidates",
                candidates: buildSendCandidates(parsed.target, parsed.content, Boolean(parsed.useFilePicker), Boolean(parsed.silent))
            };
        }
        case "send_channel": {
            if (!parsed.content) {
                return { type: "invalid", reason: "Message content is required." };
            }
            return {
                type: "candidates",
                candidates: buildSendChannelCandidates(parsed.target, parsed.content, Boolean(parsed.useFilePicker), Boolean(parsed.silent))
            };
        }
        case "open_dm":
            return { type: "candidates", candidates: buildOpenDmCandidates(parsed.target) };
        case "go_to":
            return { type: "candidates", candidates: buildGoToCandidates(parsed.target) };
        case "open_settings":
            return { type: "candidates", candidates: buildOpenSettingsCandidates(parsed.target) };
        case "toggle_plugin":
            return { type: "candidates", candidates: buildTogglePluginCandidates(parsed.target) };
        case "open_url":
            return { type: "candidates", candidates: buildOpenUrlCandidates(parsed.target) };
        case "create_notebook":
            return { type: "candidates", candidates: buildCreateNotebookCandidates(parsed.target) };
        case "delete_notebook":
            return { type: "candidates", candidates: buildDeleteNotebookCandidates(parsed.target) };
        case "move_note":
            return { type: "candidates", candidates: buildMoveNoteCandidates(parsed.target) };
        case "jump_note":
            return { type: "candidates", candidates: buildJumpNoteCandidates(parsed.target) };
        case "schedule_message":
            return { type: "candidates", candidates: buildQuickScheduleMessageCandidates(parsed.target) };
        case "reschedule_message":
            return { type: "candidates", candidates: buildRescheduleMessageCandidates(parsed.target) };
        case "send_scheduled_now":
            return { type: "candidates", candidates: buildSendScheduledNowCandidates(parsed.target) };
        case "cancel_scheduled_message":
            return { type: "candidates", candidates: buildCancelScheduledMessageCandidates(parsed.target) };
        default:
            return { type: "none" };
    }
}
