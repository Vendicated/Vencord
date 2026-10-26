/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType, PluginSettingComponentDef } from "@utils/types";

// "Private" provides custom typing, not encryption or an exemption from Vencord sync/backup.
export function createSettings(component: PluginSettingComponentDef["component"]) {
    return definePluginSettings({ controls: { type: OptionType.COMPONENT, component } })
        .withPrivateSettings<{ preferences?: unknown; }>();
}
