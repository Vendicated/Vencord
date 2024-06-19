/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findLazy } from "@webpack";

export const UserSettingsActionCreators = {
    FrecencyUserSettingsActionCreators: findLazy(m => m.typeName?.endsWith(".FrecencyUserSettings")),
    PreloadedUserSettingsActionCreators: findLazy(m => m.typeName?.endsWith(".PreloadedUserSettings")),
};
