/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// eslint-disable-next-line path-alias/no-relative
import { find } from "../api";

export const UserSettingsActionCreators = {
    FrecencyUserSettingsActionCreators: find(m => m.ProtoClass?.typeName?.endsWith(".FrecencyUserSettings")),
    PreloadedUserSettingsActionCreators: find(m => m.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings")),
};
