/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy, findStoreLazy } from "@webpack";

import * as t from "./types/stores";

export const ApplicationStreamingStore: t.ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
export const RunningGameStore: t.RunningGameStore = findStoreLazy("RunningGameStore");
export const QuestsStore: t.QuestsStore = findByPropsLazy("getQuest");
export const ChannelStore: t.ChannelStore = findStoreLazy("ChannelStore");
export const GuildChannelStore: t.GuildChannelStore = findStoreLazy("GuildChannelStore");
