/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Constants, RestAPI } from "@webpack/common";

import { OpenNotesDataButton } from "./components/NotesDataButton";
import { refreshNotesData } from "./components/NotesDataModal";
import { NotesMap, updateNote } from "./data";
import settings from "./settings";

export default definePlugin({
    name: "NotesSearcher",
    description: "Allows you to open modal with all of your notes and search throught them by UserID, Note text and Global/Username if user is cached",
    authors: [Devs.Vishnya],
    settings,
    patches: [
        {
            find: "noteRef",
            replacement: {
                match: /\i\.\i\.updateNote\((\i),(\i)\)/,
                replace: "$self.updateNote($1, $2) || $self.refreshNotesData() || $&",
            },
        },
        {
            find: "toolbar:function",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addToolBarButton(arguments[0]);$2"
            }
        },
    ],
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

    updateNote,
    refreshNotesData,

    start: async () => {
        const result = await RestAPI.get({ url: Constants.Endpoints.NOTES });

        const userNotes: { [userId: string]: string; } | undefined = result.body;

        if (!userNotes) return;

        for (const [userId, note] of Object.entries(userNotes)) {
            NotesMap.set(userId, note);
        }
    }
});
