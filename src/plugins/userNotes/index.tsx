/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { openUserNotesModal } from "./components/UserNotesModal";
import settings from "./settings";

const patchUserContext: NavContextMenuPatchCallback = (children, { user }: {
	user: User;
}) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;

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

    contextMenus: {
        "user-context": patchUserContext,
    },
});
