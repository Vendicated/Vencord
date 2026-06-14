/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import type { ActivityUserScript } from "./shared";
import { UserScriptsSettings } from "./UserScriptsSettings";

const DATA_STORE_KEY = "ActivityUserScripts_scripts";
let scriptsCache: Record<string, ActivityUserScript> = {};

export const settings = definePluginSettings({
    scriptsComponent: {
        type: OptionType.COMPONENT,
        component: UserScriptsSettings,
    },
});

export function getScripts() {
    return scriptsCache;
}

export async function loadScripts() {
    scriptsCache = await DataStore.get<Record<string, ActivityUserScript>>(DATA_STORE_KEY) ?? {};
    return scriptsCache;
}

export function saveScript(script: ActivityUserScript) {
    const scripts = {
        ...scriptsCache,
        [script.id]: script,
    };

    saveScripts(scripts);
    return scripts;
}

export function removeScript(id: string) {
    const { [id]: _, ...scripts } = scriptsCache;
    saveScripts(scripts);
    return scripts;
}

function saveScripts(scripts: Record<string, ActivityUserScript>) {
    scriptsCache = scripts;
    DataStore.set(DATA_STORE_KEY, scripts).catch(() => null);
}
