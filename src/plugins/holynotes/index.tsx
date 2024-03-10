/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { addButton, removeButton } from "@api/MessagePopover";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { ChannelStore, Menu } from "@webpack/common";
import { Message } from "discord-types/general";

import { Popover as NoteButtonPopover } from "./components/icons/NoteButton";
import { NoteModal } from "./components/modals/Notebook";
import noteHandler, { noteHandlerCache } from "./noteHandler";
import { DataStoreToCache } from "./utils";

const messageContextMenuPatch: NavContextMenuPatchCallback = async (children, { message }: { message: Message; }) => {
    children.push(
        <Menu.MenuItem label="Add Message To" id="add-message-to-note">
            {Object.keys(noteHandler.getAllNotes()).map((notebook: string, index: number) => (
                <Menu.MenuItem
                    label={notebook}
                    id={notebook}
                    action={() => noteHandler.addNote(message, notebook)}
                />
            ))}
        </Menu.MenuItem>
    );
};


export default definePlugin({
    name: "HolyNotes",
    description: "Holy Notes allows you to save messages",
    authors: [Devs.Wolfie],
    dependencies: ["MessagePopoverAPI", "ChatInputButtonAPI"],


    toolboxActions: {
        async "Open Notes"() {
            openModal(props => <NoteModal {...props} />);
        }
    },
    contextMenus: {
        "message": messageContextMenuPatch
    },

    async start() {
        if (await DataStore.keys().then(keys => !keys.includes("Main"))) return noteHandler.newNoteBook("Main");
        if (!noteHandlerCache.has("Main")) await DataStoreToCache();

        addButton("HolyNotes", message => {
            return {
                label: "Save Note",
                icon: NoteButtonPopover,
                message: message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => noteHandler.addNote(message, "Main")
            };
        });
    },

    async stop() {
        removeButton("HolyNotes");
    }
});

