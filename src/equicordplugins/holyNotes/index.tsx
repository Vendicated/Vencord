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
import { BookmarkIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findByCodeLazy, findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { ChannelStore, Menu } from "@webpack/common";

import { NoteModal } from "./components/modals/Notebook";
import { noteHandler, noteHandlerCache } from "./NoteHandler";
import { DataStoreToCache, HolyNoteStore } from "./utils";

export const cl = classNameFactory("vc-notebook-");
export const CircleQuestionIcon = findComponentByCodeLazy("10.58l-3.3-3.3a1");
export const MessageRecord = findByCodeLazy("isEdited(){");
export const messageClasses = findCssClassesLazy("message", "groupStart", "cozyMessage");
export const resultsClasses = findCssClassesLazy("emptyResultsWrap", "emptyResultsContent", "errorImage", "emptyResultsText", "noResultsImage", "alt");
export const ChannelRecord = findByCodeLazy("computeLurkerPermissionsAllowList(){");

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

export let ChannelMessage;
export default definePlugin({
    name: "HolyNotes",
    description: "Save messages as notes to revisit later",
    dependencies: ["MessagePopoverAPI", "HeaderBarAPI"],
    tags: ["Chat", "Organisation"],
    authors: [EquicordDevs.Wolfie],
    patches: [
        {
            find: "Message must not be a thread starter message",
            replacement: [
                {
                    // Append messagelogger-deleted to classNames if deleted
                    match: /(?<=let (\i)=\i\.memo\(function\(\i\)\{.{0,200}\.THREAD_STARTER_MESSAGE.*?bg-flash-.{0,10}:\i\}\);)/,
                    replace: "ChannelMessage=$1;"
                },
            ],
        }
    ],
    set ChannelMessage(value: any) {
        ChannelMessage = value;
    },

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
