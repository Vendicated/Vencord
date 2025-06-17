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

import { findByCodeLazy, findByPropsLazy } from "@webpack";
import type * as Stores from "discord-types/stores";

import { waitForStore } from "./internal";
import * as t from "./types/stores";

export const Flux: t.Flux = findByPropsLazy("connectStores");

export type GenericStore = t.FluxStore & Record<string, any>;

export const DraftType = findByPropsLazy("ChannelMessage", "SlashCommand");

export let MessageStore: Omit<Stores.MessageStore, "getMessages"> & GenericStore & {
    getMessages(chanId: string): any;
};

// TODO: The correct name for this is ChannelActionCreators and it has already been exported again from utils. Remove this export once enough time has passed
export const PrivateChannelsStore = findByPropsLazy("openPrivateChannel");
export let PermissionStore: GenericStore;
export let GuildChannelStore: GenericStore;
export let ReadStateStore: GenericStore;
export let PresenceStore: GenericStore;

export let GuildStore: t.GuildStore;
export let UserStore: Stores.UserStore & t.FluxStore;
export let UserProfileStore: GenericStore;
export let SelectedChannelStore: Stores.SelectedChannelStore & t.FluxStore;
export let SelectedGuildStore: t.FluxStore & Record<string, any>;
export let ChannelStore: Stores.ChannelStore & t.FluxStore;
export let GuildMemberStore: Stores.GuildMemberStore & t.FluxStore;
export let RelationshipStore: t.RelationshipStore;

export let EmojiStore: t.EmojiStore;
export let ThemeStore: t.ThemeStore;
export let WindowStore: t.WindowStore;
export let DraftStore: t.DraftStore;

/**
 * React hook that returns stateful data for one or more stores
 * You might need a custom comparator (4th argument) if your store data is an object
 * @param stores The stores to listen to
 * @param mapper A function that returns the data you need
 * @param dependencies An array of reactive values which the hook depends on. Use this if your mapper or equality function depends on the value of another hook
 * @param isEqual A custom comparator for the data returned by mapper
 *
 * @example const user = useStateFromStores([UserStore], () => UserStore.getCurrentUser(), null, (old, current) => old.id === current.id);
 */
export const useStateFromStores: t.useStateFromStores = findByCodeLazy("useStateFromStores");

waitForStore("DraftStore", s => DraftStore = s);
waitForStore("UserStore", s => UserStore = s);
waitForStore("UserProfileStore", m => UserProfileStore = m);
waitForStore("ChannelStore", m => ChannelStore = m);
waitForStore("SelectedChannelStore", m => SelectedChannelStore = m);
waitForStore("SelectedGuildStore", m => SelectedGuildStore = m);
waitForStore("GuildStore", m => GuildStore = m);
waitForStore("GuildMemberStore", m => GuildMemberStore = m);
waitForStore("RelationshipStore", m => RelationshipStore = m);
waitForStore("PermissionStore", m => PermissionStore = m);
waitForStore("PresenceStore", m => PresenceStore = m);
waitForStore("ReadStateStore", m => ReadStateStore = m);
waitForStore("GuildChannelStore", m => GuildChannelStore = m);
waitForStore("MessageStore", m => MessageStore = m);
waitForStore("WindowStore", m => WindowStore = m);
waitForStore("EmojiStore", m => EmojiStore = m);
waitForStore("ThemeStore", m => {
    ThemeStore = m;
    // Importing this directly can easily cause circular imports. For this reason, use a non import access here.
    Vencord.QuickCss.initQuickCssThemeStore();
});
