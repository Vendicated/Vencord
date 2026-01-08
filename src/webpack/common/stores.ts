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

import * as t from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";

import { waitForStore } from "./internal";

export const Flux: t.Flux = findByPropsLazy("connectStores");

export type GenericStore = t.FluxStore & Record<string, any>;

export const DraftType = findByPropsLazy("ChannelMessage", "SlashCommand");

export let MessageStore: Omit<t.MessageStore, "getMessages"> & GenericStore & {
    getMessages(chanId: string): any;
};

export let PermissionStore: t.PermissionStore;
export let GuildChannelStore: t.GuildChannelStore;
export let ReadStateStore: t.ReadStateStore;
export let PresenceStore: t.PresenceStore;
export let AccessibilityStore: t.AccessibilityStore;

export let GuildStore: t.GuildStore;
export let GuildRoleStore: t.GuildRoleStore;
export let GuildScheduledEventStore: t.GuildScheduledEventStore;
export let GuildMemberCountStore: t.GuildMemberCountStore;
export let GuildMemberStore: t.GuildMemberStore;
export let UserStore: t.UserStore;
export let AuthenticationStore: t.AuthenticationStore;
export let ApplicationStore: t.ApplicationStore;
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
export let SpotifyStore: t.SpotifyStore;

export let MediaEngineStore: t.MediaEngineStore;
export let NotificationSettingsStore: t.NotificationSettingsStore;
export let SpellCheckStore: t.SpellCheckStore;
export let UploadAttachmentStore: t.UploadAttachmentStore;
export let OverridePremiumTypeStore: t.OverridePremiumTypeStore;
export let RunningGameStore: t.RunningGameStore;
export let ActiveJoinedThreadsStore: t.ActiveJoinedThreadsStore;
export let UserGuildSettingsStore: t.UserGuildSettingsStore;
export let UserSettingsProtoStore: t.UserSettingsProtoStore;
export let CallStore: t.CallStore;
export let ChannelRTCStore: t.ChannelRTCStore;
export let FriendsStore: t.FriendsStore;
export let InstantInviteStore: t.InstantInviteStore;
export let InviteStore: t.InviteStore;
export let LocaleStore: t.LocaleStore;
export let RTCConnectionStore: t.RTCConnectionStore;
export let SoundboardStore: t.SoundboardStore;
export let PopoutWindowStore: t.PopoutWindowStore;
export let ApplicationCommandIndexStore: t.ApplicationCommandIndexStore;
export let EditMessageStore: t.EditMessageStore;
export let QuestStore: t.QuestStore;

/**
 * @see jsdoc of {@link t.useStateFromStores}
 */
export const useStateFromStores: t.useStateFromStores = findByCodeLazy("useStateFromStores");

waitForStore("AccessibilityStore", s => AccessibilityStore = s);
waitForStore("ApplicationStore", s => ApplicationStore = s);
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
waitForStore("MediaEngineStore", m => MediaEngineStore = m);
waitForStore("NotificationSettingsStore", m => NotificationSettingsStore = m);
waitForStore("SpellcheckStore", m => SpellCheckStore = m);
waitForStore("PermissionStore", m => PermissionStore = m);
waitForStore("PresenceStore", m => PresenceStore = m);
waitForStore("ReadStateStore", m => ReadStateStore = m);
waitForStore("GuildChannelStore", m => GuildChannelStore = m);
waitForStore("GuildRoleStore", m => GuildRoleStore = m);
waitForStore("GuildScheduledEventStore", m => GuildScheduledEventStore = m);
waitForStore("GuildMemberCountStore", m => GuildMemberCountStore = m);
waitForStore("MessageStore", m => MessageStore = m);
waitForStore("WindowStore", m => WindowStore = m);
waitForStore("EmojiStore", m => EmojiStore = m);
waitForStore("StickersStore", m => StickersStore = m);
waitForStore("TypingStore", m => TypingStore = m);
waitForStore("VoiceStateStore", m => VoiceStateStore = m);
waitForStore("StreamerModeStore", m => StreamerModeStore = m);
waitForStore("SpotifyStore", m => SpotifyStore = m);
waitForStore("OverridePremiumTypeStore", m => OverridePremiumTypeStore = m);
waitForStore("UploadAttachmentStore", m => UploadAttachmentStore = m);
waitForStore("RunningGameStore", m => RunningGameStore = m);
waitForStore("ActiveJoinedThreadsStore", m => ActiveJoinedThreadsStore = m);
waitForStore("UserGuildSettingsStore", m => UserGuildSettingsStore = m);
waitForStore("UserSettingsProtoStore", m => UserSettingsProtoStore = m);
waitForStore("CallStore", m => CallStore = m);
waitForStore("ChannelRTCStore", m => ChannelRTCStore = m);
waitForStore("FriendsStore", m => FriendsStore = m);
waitForStore("InstantInviteStore", m => InstantInviteStore = m);
waitForStore("InviteStore", m => InviteStore = m);
waitForStore("LocaleStore", m => LocaleStore = m);
waitForStore("RTCConnectionStore", m => RTCConnectionStore = m);
waitForStore("SoundboardStore", m => SoundboardStore = m);
waitForStore("PopoutWindowStore", m => PopoutWindowStore = m);
waitForStore("ApplicationCommandIndexStore", m => ApplicationCommandIndexStore = m);
waitForStore("EditMessageStore", m => EditMessageStore = m);
waitForStore("QuestStore", m => QuestStore = m);
waitForStore("ThemeStore", m => {
    ThemeStore = m;
    // Importing this directly causes all webpack commons to be imported, which can easily cause circular dependencies.
    // For this reason, use a non import access here.
    Vencord.Api.Themes.initQuickCssThemeStore(m);
});
