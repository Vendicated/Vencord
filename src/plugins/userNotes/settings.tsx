/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Alerts, Button, showToast } from "@webpack/common";
import { User } from "discord-types/general";

import { clearUserNotes, transferUserNotes } from "./data";

const token = findByPropsLazy("getToken");

let a: User;

export default definePluginSettings({
    removeRegularButton: {
        type: OptionType.BOOLEAN,
        description:
            'Removes the regular "Add Note"/"Edit Note" button from the user context menu',
        default: true,
    },
    replaceRegularNotes: {
        type: OptionType.BOOLEAN,
        description:
            'Replace the regular "Notes" section by button to open notes from plugin',
        default: true,
        restartNeeded: true,
    },
    disableSpellCheck: {
        type: OptionType.BOOLEAN,
        description: 'Disable "Spellcheck" in notes',
        default: false,
    },
    addNotesDataToolBar: {
        default: true,
        type: OptionType.BOOLEAN,
        description: 'Add "Open Notes Data" button to toolbar',
        restartNeeded: true,
    },
    startupCache: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Cache all users on startup",
    },
    transferExistingNotes: {
        type: OptionType.COMPONENT,
        description:
            "Transfer existing Discord notes into this plugin's data",
        component: () =>
            <Button onClick={() => {
                // didn't find better way to get current user notes :))
                fetch("https://discord.com/api/v9/users/@me/notes", {
                    method: "GET",
                    headers: {
                        Authorization: token.getToken(),
                    }
                }).then(async r => {
                    r.json().then(resularUsersNotes => {
                        transferUserNotes(resularUsersNotes);
                        showToast("Successfully transferred", 1);
                    }).catch(() => {
                        showToast("Unable to retrieve regular Discord notes", 2);
                    });
                }).catch(() => {
                    showToast("Unable to retrieve regular Discord notes", 2);
                });
            }}>
                Transfer existing regular notes from Discord
            </Button>
    },
    clearNotes: {
        type: OptionType.COMPONENT,
        description: "Clear plugin's notes",
        component: () =>
            <Button
                color={Button.Colors.RED}
                onClick={() => Alerts.show({
                    title: "Clear Notes",
                    body: "Are you sure you want to clear plugin's notes?",
                    confirmColor: Button.Colors.RED,
                    confirmText: "Clear",
                    cancelText: "Cancel",
                    onConfirm: () => {
                        clearUserNotes();
                        showToast("Successfully cleared", 1);
                    },
                })}
            >
                Clear Plugin's Notes
            </Button>
    },
});
