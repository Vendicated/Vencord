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

import type * as Stores from "discord-types/stores";

// eslint-disable-next-line path-alias/no-relative
import { findByPropsLazy } from "../webpack";
import { waitForStore } from "./internal";
import * as t from "./types/stores";

export const Flux: t.Flux = findByPropsLazy("connectStores");

export type GenericStore = t.FluxStore & Record<string, any>;

export const { DraftType }: { DraftType: typeof t.DraftType; } = findByPropsLazy("DraftType");

export let MessageStore: Omit<Stores.MessageStore, "getMessages"> & {
    getMessages(chanId: string): any;
};

// Original name: ChannelActionCreators, this is not actually a FluxStore
export const PrivateChannelsStore = findByPropsLazy("openPrivateChannel");
export let PermissionStore: GenericStore;
export let GuildChannelStore: GenericStore;
export let ReadStateStore: GenericStore;
export let PresenceStore: GenericStore;

export let GuildStore: t.GuildStore;
export let UserStore: t.UserStore;
export let UserProfileStore: t.UserProfileStore;
export let SelectedChannelStore: t.SelectedChannelStore;
export let SelectedGuildStore: t.SelectedGuildStore;
export let ChannelStore: t.ChannelStore;
export let GuildMemberStore: t.GuildMemberStore;
export let RelationshipStore: t.RelationshipStore;

export let EmojiStore: t.EmojiStore;
export let WindowStore: t.WindowStore;
export let DraftStore: t.DraftStore;

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
export const useStateFromStores: t.useStateFromStores = findByPropsLazy("useStateFromStores").useStateFromStores;

waitForStore("ChannelStore", m => ChannelStore = m);
waitForStore("DraftStore", s => DraftStore = s);
waitForStore("EmojiStore", m => EmojiStore = m);
waitForStore("GuildChannelStore", m => GuildChannelStore = m);
waitForStore("GuildMemberStore", m => GuildMemberStore = m);
waitForStore("GuildStore", m => GuildStore = m);
waitForStore("MessageStore", m => MessageStore = m);
waitForStore("PermissionStore", m => PermissionStore = m);
waitForStore("PresenceStore", m => PresenceStore = m);
waitForStore("ReadStateStore", m => ReadStateStore = m);
waitForStore("RelationshipStore", m => RelationshipStore = m);
waitForStore("SelectedChannelStore", m => SelectedChannelStore = m);
waitForStore("SelectedGuildStore", m => SelectedGuildStore = m);
waitForStore("UserProfileStore", m => UserProfileStore = m);
waitForStore("UserStore", s => UserStore = s);
waitForStore("WindowStore", m => WindowStore = m);
