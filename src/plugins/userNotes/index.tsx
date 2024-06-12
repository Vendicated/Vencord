/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Button, Menu, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { openUserNotesModal } from "./components/UserNotesModal";
import settings from "./settings";

const patchUserContext: NavContextMenuPatchCallback = (children, { user }: {
	user: User;
}) => {
    if (!user) return;

    const contextGroup = findGroupChildrenByChildId("note", children);

    if (!contextGroup) return;

    const regularButtonIndex = contextGroup.findIndex(element => element?.props.id === "note");

    if (!regularButtonIndex) return;

    const newUserNotesButton = <Menu.MenuItem
        id="vc-open-user-notes"
        label="Open User Notes"
        action={() => {
            openUserNotesModal(user);
        }}
    />;

    if (settings.store.removeRegularButton) {
        contextGroup.splice(regularButtonIndex, 1, newUserNotesButton);
    } else {
        contextGroup.splice(regularButtonIndex + 1, 0, newUserNotesButton);
    }
};

export default definePlugin({
    name: "UserNotes",
    description: "Allows you to write unlimited notes for users. Unlike Discord, which restricts note saving to a maximum of 500 users and removes older notes when this limit is exceeded.",
    authors: [Devs.Vishnya],
    settings,
    patches: [
        {
            predicate: () => {
                return settings.store.replaceRegularNotes;
            },
            find: ".default.Messages.NOTE_PLACEHOLDER,",
            replacement: {
                match: /componentDidMount\(\)\{if.{0,250}\}render\(\)\{.{0,300}\.Messages\.LOADING_NOTE.{0,300}\}constructor/,
                replace: "componentDidMount(){}render(){return $self.notesSectionRender(this.props.userId)}constructor"
            }
        }
    ],

    notesSectionRender: (userId: string) => {
        const user = UserStore.getUser(userId);

        return <Button
            className={"vc-user-notes-profile-button"}
            color={Button.Colors.PRIMARY}
            size={Button.Sizes.NONE}
            onClick={() => {
                openUserNotesModal(user);
            }}
        >
			Open Notes
        </Button>;
    },

    contextMenus: {
        "user-context": patchUserContext,
    },
});
