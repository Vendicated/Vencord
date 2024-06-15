/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";

import type { UserSettingDefinition } from "./types/UserSettingDefinition";

export const UserSettings: Record<string, UserSettingDefinition> = findByPropsLazy("MessageDisplayCompact", "ShowCurrentGame");

export const UserSettingsProtoActionCreators = findByPropsLazy("PreloadedUserSettingsActionCreators");
