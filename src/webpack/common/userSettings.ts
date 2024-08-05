/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { find } from "@webpack";

export const UserSettingsActionCreators = {
    FrecencyUserSettingsActionCreators: find(m => m.ProtoClass?.typeName?.endsWith(".FrecencyUserSettings")),
    PreloadedUserSettingsActionCreators: find(m => m.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings")),
};
