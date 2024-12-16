/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Logger } from "@utils/Logger";

import openChangelogModal from "./ChangelogModal";

const DATA_KEY = "VencordVersion_LastKnown";

const logger = new Logger("VersionNotifier", "green");

export async function checkForVencordUpdate(): Promise<void> {
    const lastKnownVersion = await DataStore.get(DATA_KEY) as string;

    if (!lastKnownVersion) {
        await DataStore.set(DATA_KEY, VERSION);
        return;
    }
    if (lastKnownVersion === VERSION) return;

    openChangelogModal(lastKnownVersion);
    await DataStore.set(DATA_KEY, VERSION);
    logger.info(`Lastknown set from ${lastKnownVersion}, to ${VERSION}`);
}
