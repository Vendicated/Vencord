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

import { findByCode, findByProps, findStore } from "@webpack";

import * as t from "./types/stores";

export const Flux = findByProps<t.Flux>("connectStores");

export type GenericStore = t.FluxStore & Record<string, any>;

export const DraftType = findByProps<typeof t.DraftType>("ChannelMessage", "SlashCommand");

// This is not actually a FluxStore
export const PrivateChannelsStore = findByProps("openPrivateChannel");
export const PermissionStore = findStore<GenericStore>("PermissionStore");
export const GuildChannelStore = findStore<GenericStore>("GuildChannelStore");
export const ReadStateStore = findStore<GenericStore>("ReadStateStore");
export const PresenceStore = findStore<GenericStore>("PresenceStore");
export const MessageStore = findStore<t.MessageStore>("MessageStore");

export const GuildStore = findStore<t.GuildStore>("GuildStore");
export const UserStore = findStore<t.UserStore>("UserStore");
export const UserProfileStore = findStore<GenericStore>("UserProfileStore");
export const SelectedChannelStore = findStore<t.SelectedChannelStore>("SelectedChannelStore");
export const SelectedGuildStore = findStore<GenericStore>("SelectedGuildStore");
export const ChannelStore = findStore<t.ChannelStore>("ChannelStore");
export const GuildMemberStore = findStore<t.GuildMemberStore>("GuildMemberStore");
export const RelationshipStore = findStore<t.RelationshipStore>("RelationshipStore");

export const EmojiStore = findStore<t.EmojiStore>("EmojiStore");
export const WindowStore = findStore<t.WindowStore>("WindowStore");
export const DraftStore = findStore<t.DraftStore>("DraftStore");

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
export const useStateFromStores = findByCode<t.useStateFromStores>("useStateFromStores");
