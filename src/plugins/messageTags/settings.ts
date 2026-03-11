/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { SettingsTagList } from "./SettingsTagList";

export const settings = definePluginSettings({
    tagsList: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, Tag>,
    },
    tagComponent: {
        type: OptionType.COMPONENT,
        component: SettingsTagList
    }
});

export interface Tag {
    name: string;
    message: string;
}

export function getTags() {
    return settings.store.tagsList;
}

export function getTag(name: string) {
    return settings.store.tagsList[name];
}

export function addTag(tag: Tag) {
    settings.store.tagsList[tag.name] = tag;
}

export function removeTag(name: string) {
    delete settings.store.tagsList[name];
}
