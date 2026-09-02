/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";

const PLUGIN_NAME = "ServerNotes";
const PLUGIN_SETTINGS_KEY = "notesData";

export interface NoteData {
    text: string;
    tags: string[];
}

export interface ServerNotesData {
    [guildId: string]: NoteData;
}

interface PluginSpecificSettings {
    enabled: boolean;
    [PLUGIN_SETTINGS_KEY]?: ServerNotesData;
    [setting: string]: any;
}

function ensureNoteDataFormat(note: string | NoteData | undefined): NoteData {
    if (typeof note === "string") {
        return { text: note, tags: [] };
    }
    if (typeof note === "object" && note !== null && typeof note.text === "string") {
        return {
            ...note,
            tags: Array.isArray(note.tags) ? note.tags.map(String) : []
        };
    }
    return { text: "", tags: [] };
}

export function getAllNotes(): ServerNotesData {
    let pluginSettings = Settings.plugins[PLUGIN_NAME] as PluginSpecificSettings | undefined;

    if (!pluginSettings) {
        pluginSettings = { enabled: true, [PLUGIN_SETTINGS_KEY]: {} };
        Settings.plugins[PLUGIN_NAME] = pluginSettings;
    } else {
        if (typeof pluginSettings.enabled === "undefined") {
            pluginSettings.enabled = true;
        }
        if (!pluginSettings[PLUGIN_SETTINGS_KEY]) {
            pluginSettings[PLUGIN_SETTINGS_KEY] = {};
        } else {
            const notesFromSettings = pluginSettings[PLUGIN_SETTINGS_KEY] as Record<string, string | NoteData | undefined>;
            const migratedNotes: ServerNotesData = {};
            for (const guildId in notesFromSettings) {
                if (Object.prototype.hasOwnProperty.call(notesFromSettings, guildId)) {
                    migratedNotes[guildId] = ensureNoteDataFormat(notesFromSettings[guildId]);
                }
            }
            pluginSettings[PLUGIN_SETTINGS_KEY] = migratedNotes;
        }
    }

    return pluginSettings[PLUGIN_SETTINGS_KEY] as ServerNotesData;
}

export function getNoteForServer(guildId: string): NoteData {
    const allNotes = getAllNotes();
    return allNotes[guildId] || { text: "", tags: [] };
}

export function saveNoteForServer(guildId: string, noteText: string, tags: string[] = []): void {
    const allNotes = getAllNotes();

    const cleanedTags = tags
        .map(tag => tag.trim())
        .filter(tag => tag !== "")
        .map(tag => tag.toLowerCase())
        .filter((tag, index, self) => self.indexOf(tag) === index);

    if (noteText.trim() === "" && cleanedTags.length === 0) {
        delete allNotes[guildId];
    } else {
        const newNoteData: NoteData = {
            text: noteText,
            tags: cleanedTags.sort(),
        };
        allNotes[guildId] = newNoteData;
    }

    const currentPluginSettings = Settings.plugins[PLUGIN_NAME] as PluginSpecificSettings;

    const plainAllNotesToSave: ServerNotesData = {};
    for (const gid in allNotes) {
        if (Object.prototype.hasOwnProperty.call(allNotes, gid)) {
            const note = allNotes[gid];
            if (note) {
                plainAllNotesToSave[gid] = {
                    text: note.text,
                    tags: [...note.tags]
                };
            }
        }
    }
    currentPluginSettings[PLUGIN_SETTINGS_KEY] = plainAllNotesToSave;
}

export function getAllUniqueTags(): string[] {
    const allNotes = getAllNotes();
    const tagSet = new Set<string>();
    Object.values(allNotes).forEach(noteData => {
        if (noteData && Array.isArray(noteData.tags)) {
            noteData.tags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}
