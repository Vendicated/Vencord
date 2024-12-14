/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import { openVersionModal } from "./VersionModal";

const DATA_KEY = "PluginVersion_LastKnown";

export async function checkForPluginUpdate(): Promise<void> {
    const lastKnownVersion = await DataStore.get(DATA_KEY) as string;
    if (lastKnownVersion !== VERSION || IS_DEV) {
        openVersionModal();
        await DataStore.set(DATA_KEY, VERSION);
    }
}
