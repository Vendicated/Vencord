/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import openVersionModal from "./VersionModal";

const DATA_KEY = "VencordVersion_LastKnown";

export async function checkForVencordUpdate(): Promise<void> {
    const lastKnownVersion = await getLastKnownVersion();

    if (!lastKnownVersion) {
        await DataStore.set(DATA_KEY, VERSION);
        return;
    }
    if (lastKnownVersion === VERSION) return;

    openVersionModal(VERSION);
    await DataStore.set(DATA_KEY, VERSION);
}

async function getLastKnownVersion(): Promise<string | undefined> {
    return await DataStore.get(DATA_KEY) as string | undefined;
}

