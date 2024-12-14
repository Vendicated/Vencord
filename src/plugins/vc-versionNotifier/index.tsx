/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import { checkForPluginUpdate } from "./versionChecker";

export default definePlugin({
    name: "VersionNotifier",
    description: "Notifies users when a new version of this plugin is available.",
    authors: [{ id: 953708302058012702n, name: "bluejutzu" }],
    enabledByDefault: true,
    flux: {
        async POST_CONNECTION_OPEN() {
            await checkForPluginUpdate();
        }
    }
});
