/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxStore } from "@webpack/types";

export type Note = {
    loading: boolean;
    note: string;
};

export type Notes = {
    [userId: string]: Note;
};

export class NoteStore extends FluxStore {
    getNotes(): Notes;
    getNote(userId: string): Note;
}
