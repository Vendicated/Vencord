/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findStoreLazy } from "@webpack";

import * as t from "./types/stores";

export const RelationshipStore: t.RelationshipStore = findStoreLazy("RelationshipStore");
export const SelectedChannelStore: t.SelectedChannelStore = findStoreLazy("SelectedChannelStore");
export const SelectedGuildStore: t.SelectedGuildStore = findStoreLazy("SelectedGuildStore");
export const UserStore: t.UserStore = findStoreLazy("UserStore");
export const ChannelStore: t.ChannelStore = findStoreLazy("ChannelStore");
export const GuildStore: t.GuildStore = findStoreLazy("GuildStore");
export const GuildMemberStore: t.GuildMemberStore = findStoreLazy("GuildMemberStore");
export const MediaEngineStore: t.MediaEngineStore = findStoreLazy("MediaEngineStore");
export const RTCConnectionStore: t.RTCConnectionStore = findStoreLazy("RTCConnectionStore");
export const UserGuildSettingsStore: t.UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");
export const UserSettingsProtoStore: t.UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
