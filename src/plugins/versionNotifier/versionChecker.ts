/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import openVersionModal from "./VersionModal";

const DATA_KEY = "VencordVersion_LastKnown";

export async function checkForVencordUpdate(): Promise<void> {
    // Output: xx.xx.xx
    const lastKnownVersion = await DataStore.get(DATA_KEY) as string;
    console.log(lastKnownVersion, VERSION, IS_DEV);
    if (lastKnownVersion !== VERSION || IS_DEV) {
        openVersionModal(lastKnownVersion);
        await DataStore.set(DATA_KEY, VERSION);
    }
}
