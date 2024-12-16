/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { checkForVencordUpdate } from "./versionChecker";

export default definePlugin({
    name: "VersionNotifier",
    description: "Show recent changes of the Vencord Repository when new commits get pushed",
    authors: [Devs.bluejutzu],
    flux: {
        async POST_CONNECTION_OPEN() {
            await checkForVencordUpdate();
        }
    }
});
