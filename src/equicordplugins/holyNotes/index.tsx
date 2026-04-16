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
import { HeaderBarButton } from "@api/HeaderBar";
import { DataStore } from "@api/index";
import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { openModal } from "@utils/modal";
import definePlugin, { IconComponent } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findByCodeLazy, findComponentByCodeLazy, findCssClassesLazy, findExportedComponentLazy } from "@webpack";
import { ChannelStore, Menu } from "@webpack/common";

import { NoteModal } from "./components/modals/Notebook";
import { noteHandler, noteHandlerCache } from "./NoteHandler";
import { DataStoreToCache, HolyNoteStore } from "./utils";

export const cl = classNameFactory("vc-notebook-");
export const CircleQuestionIcon = findExportedComponentLazy("CircleQuestionIcon");
export const BookmarkIconLazy = findExportedComponentLazy("BookmarkIcon");
export const BookmarkIcon: IconComponent = props => <BookmarkIconLazy {...props} />;
export const MessageRecord = findByCodeLazy("isEdited(){");
export const messageClasses = findCssClassesLazy("message", "groupStart", "cozyMessage");
export const resultsClasses = findCssClassesLazy("emptyResultsWrap", "emptyResultsContent", "errorImage", "emptyResultsText", "noResultsImage", "alt");
export const ChannelRecord = findByCodeLazy("computeLurkerPermissionsAllowList(){");
export const ChannelMessage = findComponentByCodeLazy("Message must not be a thread");

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    children.push(
        <Menu.MenuItem label="Note Message" id="note-message">
            {Object.keys(noteHandler.getAllNotes()).map(notebook => (
                <Menu.MenuItem
                    key={notebook}
                    label={notebook}
                    id={notebook}
                    action={() => noteHandler.addNote(message, notebook)}
                />
            ))}
        </Menu.MenuItem>
    );
};

function ToolBarHeader() {
    return (
        <HeaderBarButton
            tooltip="Holy Notes"
            position="bottom"
            icon={BookmarkIcon}
            onClick={() => openModal(props => <NoteModal {...props} />)}
        />
    );
}

export default definePlugin({
    name: "HolyNotes",
    description: "Save messages as notes to revisit later",
    authors: [EquicordDevs.Wolfie],

    toolboxActions: {
        "Open Notes"() {
            openModal(props => <NoteModal {...props} />);
        }
    },

    contextMenus: {
        message: messageContextMenuPatch
    },

    headerBarButton: {
        icon: BookmarkIcon,
        render: ToolBarHeader
    },

    messagePopoverButton: {
        icon: BookmarkIcon,
        render(message) {
            return {
                label: "Save Note",
                icon: BookmarkIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => noteHandler.addNote(message, "Main")
            };
        }
    },

    async start() {
        const keys = await DataStore.keys(HolyNoteStore);
        if (!keys.includes("Main")) {
            noteHandler.newNoteBook("Main");
            return;
        }
        if (!noteHandlerCache.has("Main")) await DataStoreToCache();
    },
});
