/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByProps } from "@webpack";

import * as t from "./types/settingsStores";


export const TextAndImagesSettingsStores = findByProps("MessageDisplayCompact") as Record<string, t.SettingsStore>;
export const StatusSettingsStores = findByProps("ShowCurrentGame") as Record<string, t.SettingsStore>;

export const UserSettingsActionCreators = findByProps("PreloadedUserSettingsActionCreators");
