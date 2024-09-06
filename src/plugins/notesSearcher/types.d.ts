/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxStore } from "@webpack/types";
import { User as User$1 } from "discord-types/general";

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

export type User = User$1 & {
    globalName?: string;
};

export type Dispatch = ReturnType<typeof useState<any>>[1];

export type UserCache = {
    id: string;
    globalName?: string;
    username: string;
    avatar: string;
};

export type UsersCache = Map<string, UserCache>;
