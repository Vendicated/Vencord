/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// eslint-disable-next-line path-alias/no-relative
import { findByProps } from "../webpack";
import * as t from "./types/settingsStores";

export const TextAndImagesSettingsStores = findByProps<Record<string, t.SettingsStore>>("MessageDisplayCompact");
export const StatusSettingsStores = findByProps<Record<string, t.SettingsStore>>("ShowCurrentGame");

export const UserSettingsActionCreators = findByProps("PreloadedUserSettingsActionCreators");
