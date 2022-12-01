/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import * as $Badges from "./Badges";
import * as $Commands from "./Commands";
import * as $DataStore from "./DataStore";
import * as $MessageAccessories from "./MessageAccessories";
import * as $MessageEventsAPI from "./MessageEvents";
import * as $MessagePopover from "./MessagePopover";
import * as $Notices from "./Notices";
import * as $ServerList from "./ServerList";

/**
 * An API allowing you to listen to Message Clicks or run your own logic
 * before a message is sent
 *
 * If your plugin uses this, you must add MessageEventsAPI to its dependencies
 */
const MessageEvents = $MessageEventsAPI;
/**
 * An API allowing you to create custom notices
 * (snackbars on the top, like the Update prompt)
 */
const Notices = $Notices;
/**
 * An API allowing you to register custom commands
 */
const Commands = $Commands;
/**
 * A wrapper around IndexedDB. This can store arbitrarily
 * large data and supports a lot of datatypes (Blob, Map, ...).
 * For a full list, see the mdn link below
 *
 * This should always be preferred over the Settings API if possible, as
 * localstorage has very strict size restrictions and blocks the event loop
 *
 * Make sure your keys are unique (tip: prefix them with ur plugin name)
 * and please clean up no longer needed entries.
 *
 * This is actually just idb-keyval, so if you're familiar with that, you're golden!
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types}
 */
const DataStore = $DataStore;
/**
 * An API allowing you to add custom components as message accessories
 */
const MessageAccessories = $MessageAccessories;
/**
 * An API allowing you to add custom buttons in the message popover
 */
const MessagePopover = $MessagePopover;
/**
 * An API allowing you to add badges to user profiles
 */
const Badges = $Badges;
/**
 * An API allowing you to add custom elements to the server list
 */
const ServerList = $ServerList;

export { Badges, Commands, DataStore, MessageAccessories, MessagePopover, MessageEvents, Notices, ServerList };
