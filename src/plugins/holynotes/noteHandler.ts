/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { ChannelStore, Toasts, lodash } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

import { Discord, HolyNotes } from "./types";
import { HolyNoteStore } from "./utils";


export default new (class NoteHandler {
    private _formatNote(channel: Channel, message: Message): HolyNotes.Note {
        return {
            id: message.id,
            channel_id: message.channel_id,
            guild_id: channel.guild_id,
            content: message.content,
            author: {
                id: message.author.id,
                avatar: message.author.avatar,
                discriminator: message.author.discriminator,
                username: message.author.username,
            },
            flags: message.flags,
            // Moment has a toString() function, this doesn't convert to '[object Object]'.
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            timestamp: message.timestamp.toString(),
            attachments: message.attachments as Discord.Attachment[],
            embeds: message.embeds,
            reactions: message.reactions as Discord.Reaction[],
            stickerItems: message.stickerItems,
        };
    }


    public async getNotes(notebook?: string): Promise<Record<string, HolyNotes.Note>> {
        if (await DataStore.keys(HolyNoteStore).then(keys => keys.includes(notebook))) {
            return await DataStore.get(notebook, HolyNoteStore) ?? {};
        } else {
            return this.newNoteBook(notebook).then(() => this.getNotes(notebook));
        }
    }

    public async getAllNotes(): Promise<HolyNotes.Note[]> {
        // Needs fucking fixing for fuck sakes VEN GIVE ME IMAGE PERMS
        return { ...await DataStore.values(HolyNoteStore) } ;
    }

    public addNote = async (message: Message, notebook: string) => {
        const notes = this.getNotes(notebook);
        const channel = ChannelStore.getChannel(message.channel_id);
        const newNotes = Object.assign({ [notebook]: { [message.id]: this._formatNote(channel, message) } }, notes);

        await DataStore.set(notebook, newNotes, HolyNoteStore);

        Toasts.show({
            id: Toasts.genId(),
            message: `Successfully added note to ${notebook}.`,
            type: Toasts.Type.SUCCESS,
        });
    };

    public deleteNote = async (noteId: string, notebook: string) => {
        const notes = this.getNotes(notebook);

        await DataStore.set(notebook, lodash.omit(notes, noteId), HolyNoteStore);

        Toasts.show({
            id: Toasts.genId(),
            message: `Successfully deleted note from ${notebook}.`,
            type: Toasts.Type.SUCCESS,
        });
    };

    public moveNote = async (note: HolyNotes.Note, from: string, to: string) => {
        const origNotebook = this.getNotes(from);
        const newNoteBook = lodash.clone(this.getNotes(to));

        newNoteBook[note.id] = note;

        await DataStore.set(from, lodash.omit(origNotebook, note.id), HolyNoteStore);
        await DataStore.set(to, newNoteBook, HolyNoteStore);

        Toasts.show({
            id: Toasts.genId(),
            message: `Successfully moved note from ${from} to ${to}.`,
            type: Toasts.Type.SUCCESS,
        });
    };

    public newNoteBook = async (notebookName: string) => {
        if (await DataStore.keys().then(keys => keys.includes(notebookName))) {
            Toasts.show({
                id: Toasts.genId(),
                message: `Notebook ${notebookName} already exists.`,
                type: Toasts.Type.FAILURE,
            });
            return;
        }
        await DataStore.set(notebookName, {}, HolyNoteStore);
        Toasts.show({
            id: Toasts.genId(),
            message: `Successfully created ${notebookName}.`,
            type: Toasts.Type.SUCCESS,
        });
    };

    public deleteNotebook = async (notebookName: string) => {
        await DataStore.del(notebookName);
        Toasts.show({
            id: Toasts.genId(),
            message: `Successfully deleted ${notebookName}.`,
            type: Toasts.Type.SUCCESS,
        });
    };
});
