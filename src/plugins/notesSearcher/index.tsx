/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

import { OpenNotesDataButton } from "./components/NotesDataButton";
import { getNotes, onNoteUpdate, onUserUpdate } from "./data";
import settings from "./settings";
import { Notes } from "./types";

export default definePlugin({
    name: "NotesSearcher",
    description: "Allows you to open a modal with all of your notes and search through them by user ID, note text, and username",
    authors: [Devs.Vishnya],
    settings,
    patches: [
        {
            find: "toolbar:function",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addToolBarButton(arguments[0]);$2",
            },
        },
        {
            find: '="NoteStore",',
            replacement: {
                match: /getNote\(\i\){return (\i)/,
                replace: "getNotes(){return $1}$&",
            },
        },
        // not sure it won't break anything but should be fine
        {
            find: '="NoteStore",',
            replacement: {
                match: /CONNECTION_OPEN:_,OVERLAY_INITIALIZE:_,/,
                replace: "",
            },
        },
        {
            find: ".REQUEST_GUILD_MEMBERS",
            replacement: {
                match: /\.send\(8,{(?!nonce)/,
                replace: "$&nonce:arguments[1].nonce,",
            },
        },
        {
            find: "GUILD_MEMBERS_REQUEST:",
            replacement: {
                match: /presences:!!(\i)\.presences(?!,nonce)/,
                replace: "$&,nonce:$1.nonce",
            },
        },
        {
            find: ".not_found",
            replacement: {
                match: /notFound:(\i)\.not_found(?!,nonce)/,
                replace: "$&,nonce:$1.nonce",
            },
        },
        {
            find: "[IDENTIFY]",
            replacement: {
                match: /capabilities:(\i\.\i),/,
                replace: "capabilities:$1&~1,",
            },
        },
        {
            find: "_handleDispatch",
            replacement: {
                match: /let \i=(\i).session_id;/,
                replace: "$&$self.ready($1);",
            },
        },
    ],

    start: async () => {
        FluxDispatcher.subscribe("USER_NOTE_UPDATE", onNoteUpdate);
        FluxDispatcher.subscribe("USER_UPDATE", onUserUpdate);
    },
    stop: () => {
        FluxDispatcher.unsubscribe("USER_NOTE_UPDATE", onNoteUpdate);
        FluxDispatcher.unsubscribe("USER_UPDATE", onUserUpdate);
    },

    ready: ({ notes }: { notes: { [userId: string]: string; }; }) => {
        const notesFromStore = getNotes();

        for (const userId of Object.keys(notesFromStore)) {
            delete notesFromStore[userId];
        }

        Object.assign(notesFromStore, Object.entries(notes).reduce((newNotes, [userId, note]) => {
            newNotes[userId] = {
                note,
                loading: false,
            };

            return newNotes;
        }, {} as Notes));
    },

    addToolBarButton: (children: { toolbar: React.ReactNode[] | React.ReactNode; }) => {
        if (Array.isArray(children.toolbar))
            return children.toolbar.push(
                <ErrorBoundary noop={true}>
                    <OpenNotesDataButton />
                </ErrorBoundary>
            );

        children.toolbar = [
            <ErrorBoundary noop={true}>
                <OpenNotesDataButton />
            </ErrorBoundary>,
            children.toolbar,
        ];
    },
});
