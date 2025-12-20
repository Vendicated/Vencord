/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as t from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";

import { waitForStore } from "./internal";

export const Flux: t.Flux = findByPropsLazy("connectStores");

export type GenericStore = t.FluxStore & Record<string, any>;

export const DraftType = findByPropsLazy("ChannelMessage", "SlashCommand");

export let MessageStore: Omit<t.MessageStore, "getMessages"> & GenericStore & {
    getMessages(chanId: string): any;
};

export let PermissionStore: GenericStore;
export let GuildChannelStore: GenericStore;
export let ReadStateStore: GenericStore;
export let PresenceStore: t.PresenceStore;

export let GuildStore: t.GuildStore;
export let GuildRoleStore: t.GuildRoleStore;
export let GuildMemberStore: t.GuildMemberStore;
export let UserStore: t.UserStore;
export let AuthenticationStore: t.AuthenticationStore;
export let UserProfileStore: t.UserProfileStore;
export let SelectedChannelStore: t.SelectedChannelStore;
export let SelectedGuildStore: t.SelectedGuildStore;
export let ChannelStore: t.ChannelStore;
export let TypingStore: t.TypingStore;
export let RelationshipStore: t.RelationshipStore;
export let VoiceStateStore: t.VoiceStateStore;

export let EmojiStore: t.EmojiStore;
export let StickersStore: t.StickersStore;
export let ThemeStore: t.ThemeStore;
export let WindowStore: t.WindowStore;
export let DraftStore: t.DraftStore;
export let StreamerModeStore: t.StreamerModeStore;

/**
 * @see jsdoc of {@link t.useStateFromStores}
 */
export const useStateFromStores: t.useStateFromStores = findByCodeLazy("useStateFromStores");

waitForStore("AuthenticationStore", s => AuthenticationStore = s);
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
waitForStore("GuildRoleStore", m => GuildRoleStore = m);
waitForStore("MessageStore", m => MessageStore = m);
waitForStore("WindowStore", m => WindowStore = m);
waitForStore("EmojiStore", m => EmojiStore = m);
waitForStore("StickersStore", m => StickersStore = m);
waitForStore("TypingStore", m => TypingStore = m);
waitForStore("VoiceStateStore", m => VoiceStateStore = m);
waitForStore("StreamerModeStore", m => StreamerModeStore = m);
waitForStore("ThemeStore", m => {
    ThemeStore = m;
    // Importing this directly causes all webpack commons to be imported, which can easily cause circular dependencies.
    // For this reason, use a non import access here.
    Vencord.Api.Themes.initQuickCssThemeStore(m);
});
