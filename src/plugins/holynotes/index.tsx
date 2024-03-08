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

import { addButton, removeButton } from "@api/MessagePopover";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { Popover as NoteButtonPopover } from "./components/icons/NoteButton";

export default definePlugin({
    name: "HolyNotes",
    description: "Holy Notes allows you to save messages",
    authors: [Devs.Wolfie],
    dependencies: ["MessagePopoverAPI", "ChatInputButtonAPI"],


    toolboxActions: {
        async "Open Notes"() {

        }
    },

    async start() {
        addButton("HolyNotes", message => {
            console.log("HolyNotes", message);

            return {
                label: "Save Note",
                icon: NoteButtonPopover,
                onClick: () => {
                    console.log("Clicked on Save Note");
                }
            };
        });
    },

    async stop() {
        removeButton("HolyNotes");
    }
});
