/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { extractAndLoadChunksLazy, findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { i18n, useEffect, useRef, useState } from "@webpack/common";

const useNote = findByCodeLazy(".getNote(");
const NoteEditor = findComponentByCodeLazy("hideNote:", ".userId);return");
const Section = findComponentByCodeLazy("section", '"header-secondary"', "requestAnimationFrame");

const classes = findByPropsLazy("note", "appsConnections");
const requireClasses = extractAndLoadChunksLazy(['"handleOpenUserProfileModal"']);

const settings = definePluginSettings({
    hideWhenEmpty: {
        description: "Hide the note box when no note is set for a user",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

function useNoteBox(userId: string) {
    const { note, loading } = useNote(userId);
    const [forced, setForced] = useState(!settings.store.hideWhenEmpty);
    const [autoFocus, setAutoFocus] = useState(false);
    const editorRef = useRef<HTMLTextAreaElement>(null);
    return {
        visible: forced || (!loading && note !== undefined),
        autoFocus,
        note,
        editorRef,
        activate() {
            setForced(true);
            setAutoFocus(true);
            editorRef.current?.focus();
        }
    };
}

function NotesSection(props: any) {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        requireClasses().then(() => setLoaded(true)).catch(() => { });
    }, []);
    if (!props.visible || !loaded) return null;
    return <Section
        title={i18n.Messages.NOTE}
        scrollIntoView={props.autoFocus}
        headingColor={props.headingColor}
    >
        <NoteEditor
            userId={props.user.id}
            className={classes.note}
            autoFocus={props.autoFocus}
            onUpdate={() => { }}
        />
    </Section>;
}

export default definePlugin({
    name: "SimplifiedProfileNotes",
    description: "Show the notes text box in the new simplified profile popouts",
    authors: [Devs.Sqaaakoi],
    settings,
    patches: [
        {
            // Popout
            find: /\.BITE_SIZE,onOpenProfile:\i,usernameIcon:/,
            replacement: {
                match: /currentUser:\i,guild:\i,onOpenProfile:.+?}\)(?=])(?<=user:(\i),bio:null==(\i)\?.+?)/,
                replace: "$&,$self.NotesSection({ user: $1, ...vencordNotesHook })"
            }
        },
        {
            // DM Sidebar
            find: /getRelationshipType.+?\.Overlay.{0,200}Messages\.USER_POPOUT_ABOUT_ME/,
            replacement: {
                match: /(\(0,.+?Messages\.USER_PROFILE_MEMBER_SINCE.+?userId:(\i)\.id}\)\}\))]/,
                replace: "$1,$self.NotesSection({ headingColor: 'header-primary' ,user: $2, ...vencordNotesHook })]"
            }
        }
    ].map(p => ({
        ...p,
        group: true,
        replacement: [
            {
                match: /getRelationshipType\((\i.id)\)\)/,
                replace: "$&,vencordNotesHook=$self.useNoteBox($1)"
            },
            {
                match: /(!\i)(&&\(0,\i\.jsx\)\(\i\.\i,{user:\i,isHovering:\i,onOpenProfile:\(\)=>).+?\({subsection:\i\.\i\.NOTE}\)/,
                replace: "($1&&!vencordNotesHook.visible)$2vencordNotesHook.activate()"
            },
            p.replacement
        ]
    })),
    useNoteBox,
    NotesSection
});
