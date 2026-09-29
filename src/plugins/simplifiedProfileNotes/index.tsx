/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { DefaultExtractAndLoadChunksRegex, extractAndLoadChunksLazy, findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { useEffect, useState } from "@webpack/common";
import { User } from "discord-types/general";

const useNote = findByCodeLazy(".getNote(");
const NoteEditor = findComponentByCodeLazy("#{intl::NOTE_PLACEHOLDER}");
const Section = findComponentByCodeLazy("section", '"header-secondary"', "requestAnimationFrame");

const classes = findByPropsLazy("note", "appsConnections");
const requireClasses = extractAndLoadChunksLazy(['"USER_PROFILE_MODAL_KEY:".concat('], new RegExp(":(?:await ?)?" + DefaultExtractAndLoadChunksRegex.source));

const settings = definePluginSettings({
    hideWhenEmpty: {
        description: "Hide the note box when no note is set for a user",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

type NoteHook = {
    visible: boolean;
    loading: boolean;
    autoFocus: boolean;
    note: string;
    activate: () => void;
};

type NotesSectionProps = {
    user: User;
    headingColor?: string;
};

function useNoteBox(userId: string): NoteHook {
    const { note, loading } = useNote(userId);
    const hasNote = !loading && (typeof note === "string" && note?.length > 0);
    const [forced, setForced] = useState(!settings.store.hideWhenEmpty || hasNote);
    const [autoFocus, setAutoFocus] = useState(false);
    if (hasNote && !forced) setForced(true);
    return {
        visible: forced || hasNote,
        loading,
        autoFocus,
        note,
        activate() {
            setForced(true);
            setAutoFocus(true);
        }
    };
}

function NotesSection(props: NoteHook & NotesSectionProps) {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        requireClasses().then(() => setLoaded(true)).catch(console.error);
    }, []);
    if (!props.visible || !loaded) return null;
    return <Section
        heading={getIntlMessage("NOTE_PRIVATE")}
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
            // Do not use the ".hasAvatarForGuild(null==" from ShowConnections as that doesn't apply to bot profiles
            find: /\.POPOUT,onClose:\i}\),nicknameIcons/,
            all: true,
            replacement: {
                match: /onOpenProfile:.+?}\)(?=])(?<=user:(\i),bio:null==(\i)\?.+?)/,
                replace: "$&,$self.NotesSection({ user: $1, ...vencordNotesHook })"
            }
        },
        {
            // DM Sidebar
            find: ".SIDEBAR}),nicknameIcons",
            replacement: {
                match: /(\(0,.{0,100}?#{intl::BOT_PROFILE_CREATED_ON}.{0,100}?userId:(\i)\.id}\)\}\))(.{0,200}?)\]\}/,
                replace: "$1$3,$self.NotesSection({ headingColor: 'header-primary', user: $2, ...vencordNotesHook })]}"
            }
        }
    ].map(p => ({
        ...p,
        group: true,
        replacement: [
            {
                match: /hidePersonalInformation\)/,
                replace: "$&,vencordNotesHook=$self.useNoteBox(arguments[0].user.id)"
            },
            {
                match: /(!\i)(&&\(0,\i\.jsx\)\(\i\.\i,{userId:\i\.id,isHovering:\i,onOpenProfile:)\i/,
                replace: "($1&&!vencordNotesHook.visible&&!vencordNotesHook.loading)$2()=>vencordNotesHook.activate()"
            },
            p.replacement
        ]
    })),
    useNoteBox,
    NotesSection: ErrorBoundary.wrap(NotesSection, {})
});
