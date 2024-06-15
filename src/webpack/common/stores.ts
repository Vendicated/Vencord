/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import type { FluxEmitter } from "@vencord/discord-types";
import type * as Stores from "@vencord/discord-types/src/stores";

// eslint-disable-next-line path-alias/no-relative
import { findByPropsLazy } from "../webpack";
import { waitForStore } from "./internal";

export const Flux: {
    Emitter: typeof FluxEmitter;
    PersistedStore: typeof Stores.FluxPersistedStore;
    Store: typeof Stores.FluxStore;
}= findByPropsLazy("connectStores");

const storeHooksModule = findByPropsLazy("useStateFromStores", "useStateFromStoresArray", "useStateFromStoresObject");

/**
 * React hook that returns stateful data for one or more stores
 * You might need a custom comparator (4th argument) if your store data is an object
 * @param stores The stores to listen to
 * @param getStateFromStores A function that returns the data you need
 * @param dependencies An array of reactive values which the hook depends on. Use this if your mapper or equality function depends on the value of another hook
 * @param areStatesEqual A custom comparator for the data returned by mapper
 *
 * @example const user = useStateFromStores([UserStore], () => UserStore.getCurrentUser(), null, (old, current) => old.id === current.id);
 */
// eslint-disable-next-line prefer-destructuring
export const useStateFromStores: Stores.UseStateFromStoresHook = storeHooksModule.useStateFromStores;

/** @see {@link useStateFromStores} */
// eslint-disable-next-line prefer-destructuring
export const useStateFromStoresArray: Stores.UseStateFromStoresArrayHook = storeHooksModule.useStateFromStoresArray;

/** @see {@link useStateFromStores} */
// eslint-disable-next-line prefer-destructuring
export const useStateFromStoresObject: Stores.UseStateFromStoresObjectHook = storeHooksModule.useStateFromStoresObject;

export let ChannelStore: Stores.ChannelStore;
waitForStore("ChannelStore", m => ChannelStore = m);

export let DraftStore: Stores.DraftStore;
waitForStore("DraftStore", s => DraftStore = s);

export let EmojiStore: Stores.EmojiStore;
waitForStore("EmojiStore", m => EmojiStore = m);

export let GuildChannelStore: Stores.GuildChannelStore;
waitForStore("GuildChannelStore", m => GuildChannelStore = m);

export let GuildMemberStore: Stores.GuildMemberStore;
waitForStore("GuildMemberStore", m => GuildMemberStore = m);

export let GuildStore: Stores.GuildStore;
waitForStore("GuildStore", m => GuildStore = m);

export let MessageStore: Stores.MessageStore;
waitForStore("MessageStore", m => MessageStore = m);

export let PermissionStore: Stores.PermissionStore;
waitForStore("PermissionStore", m => PermissionStore = m);

export let PresenceStore: Stores.PresenceStore;
waitForStore("PresenceStore", m => PresenceStore = m);

export let ReadStateStore: Stores.ReadStateStore;
waitForStore("ReadStateStore", m => ReadStateStore = m);

export let RelationshipStore: Stores.RelationshipStore;
waitForStore("RelationshipStore", m => RelationshipStore = m);

export let SelectedChannelStore: Stores.SelectedChannelStore;
waitForStore("SelectedChannelStore", m => SelectedChannelStore = m);

export let SelectedGuildStore: Stores.SelectedGuildStore;
waitForStore("SelectedGuildStore", m => SelectedGuildStore = m);

export let UserProfileStore: Stores.UserProfileStore;
waitForStore("UserProfileStore", m => UserProfileStore = m);

export let UserStore: Stores.UserStore;
waitForStore("UserStore", s => UserStore = s);

export let WindowStore: Stores.WindowStore;
waitForStore("WindowStore", m => WindowStore = m);
