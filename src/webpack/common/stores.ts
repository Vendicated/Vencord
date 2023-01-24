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


import * as Stores from "discord-types/stores";

// eslint-disable-next-line path-alias/no-relative
import { findByPropsLazy, waitFor } from "../webpack";

export const MessageStore = findByPropsLazy("getRawMessages") as Omit<Stores.MessageStore, "getMessages"> & {
    getMessages(chanId: string): any;
};
export const PermissionStore = findByPropsLazy("can", "getGuildPermissions");
export const PrivateChannelsStore = findByPropsLazy("openPrivateChannel");
export const GuildChannelStore = findByPropsLazy("getChannels");
export const ReadStateStore = findByPropsLazy("lastMessageId");
export const PresenceStore = findByPropsLazy("setCurrentUserOnConnectionOpen");

export let GuildStore: Stores.GuildStore;
export let UserStore: Stores.UserStore;
export let SelectedChannelStore: Stores.SelectedChannelStore;
export let SelectedGuildStore: any;
export let ChannelStore: Stores.ChannelStore;
export let GuildMemberStore: Stores.GuildMemberStore;
export let RelationshipStore: Stores.RelationshipStore & {
    /** Get the date (as a string) that the relationship was created */
    getSince(userId: string): string;
};

waitFor(["getCurrentUser", "initialize"], m => UserStore = m);
waitFor("getSortedPrivateChannels", m => ChannelStore = m);
waitFor("getCurrentlySelectedChannelId", m => SelectedChannelStore = m);
waitFor("getLastSelectedGuildId", m => SelectedGuildStore = m);
waitFor("getGuildCount", m => GuildStore = m);
waitFor(["getMember", "initialize"], m => GuildMemberStore = m);
waitFor("getRelationshipType", m => RelationshipStore = m);
