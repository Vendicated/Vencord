/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy, findLazy } from "@webpack";

import * as t from "./types/settingsStores";


// FIXME
export const TextAndImagesSettingsStores = findByPropsLazy("MessageDisplayCompact") as Record<string, t.SettingsStore>;
export const StatusSettingsStores = findByPropsLazy("ShowCurrentGame") as Record<string, t.SettingsStore>;

export const UserSettingsActionCreators = {
    FrecencyUserSettingsActionCreators: findLazy(m => m.typeName?.endsWith(".FrecencyUserSettings")),
    PreloadedUserSettingsActionCreators: findLazy(m => m.typeName?.endsWith(".PreloadedUserSettings")),
};
