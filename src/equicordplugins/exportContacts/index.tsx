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

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Clipboard, Toasts } from "@webpack/common";

interface User {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
    publicFlags: number;
    avatarDecorationData?: any;
    globalName: string;
}

interface ContactsList {
    id: string;
    type: number;
    nickname?: any;
    user: User;
    since: string;
}

// for type parameter, it takes in a number that determines the type of the contact
// 1 is friends added
// 2 is blocked users
// 3 is incoming friend requests
// 4 is outgoing friend requests
function getUsernames(contacts: ContactsList[], type: number): string[] {
    return contacts
        // only select contacts that are the specified type
        .filter(e => e.type === type)
        // return the username, and discriminator if necessary
        .map(e => e.user.discriminator === "0" ? e.user.username : e.user.username + "#" + e.user.discriminator);
}

export default definePlugin({
    name: "ExportContacts",
    description: "Export a list of friends to your clipboard. Adds a new button to the menu bar for the friends tab.",
    authors: [EquicordDevs.dat_insanity],
    patches: [
        {
            find: "fetchRelationships(){",
            replacement: {
                match: /\.then\(e=>o\.default\.dispatch\({type:"LOAD_RELATIONSHIPS_SUCCESS",relationships:e\.body}\)/,
                replace: ".then(e=>{o.default.dispatch({type:\"LOAD_RELATIONSHIPS_SUCCESS\",relationships:e.body}); $self.getContacts(e.body)}"
            }
        },
        {
            find: "[role=\"tab\"][aria-disabled=\"false\"]",
            replacement: {
                match: /this\.props;return\(/,
                replace: "this.props;console.log(a.Children);return("
            }
        },
        {
            find: "[role=\"tab\"][aria-disabled=\"false\"]",
            replacement: {
                match: /(\w+)\.Children\.map\((\w+),\s*this\.renderChildren\)/,
                replace: "[...$1.Children.map($2,this.renderChildren),$self.addExportButton()]"
            }
        }
    ],

    getContacts(contacts: ContactsList[]) {
        this.contactList = {
            friendsAdded: [...getUsernames(contacts, 1)],
            blockedUsers: [...getUsernames(contacts, 2)],
            incomingFriendRequests: [...getUsernames(contacts, 3)],
            outgoingFriendRequests: [...getUsernames(contacts, 4)]
        };
    },

    addExportButton() {
        return <ErrorBoundary noop key=".2">
            <button className="export-contacts-button" onClick={() => { this.copyContactToClipboard(); console.log("clicked"); }}>Export</button>
        </ErrorBoundary>;
    },

    copyContactToClipboard() {
        if (this.contactList) {
            Clipboard.copy(JSON.stringify(this.contactList));
            Toasts.show({
                message: "Contacts copied to clipboard successfully.",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
                options: {
                    duration: 3000,
                    position: Toasts.Position.BOTTOM
                }
            });
            return;
        }
        // reason why you need to click the all tab is because the data is extracted during
        // the request itself when you fetch all your friends. this is done to avoid sending a
        // manual request to discord, which may raise suspicion and might even get you terminated.
        Toasts.show({
            message: "Contact list is undefined. Click on the \"All\" tab before exporting.",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
    }
});
