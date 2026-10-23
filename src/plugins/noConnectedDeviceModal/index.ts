/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoConnectedDeviceModal",
    description: 'Disables the "new media device detected" modal',
    authors: [Devs.RyanCaoDev],
    tags: ["Appearance", "Media", "Utility"],

    patches: [
        {
            find: "lastOutputSystemDevice.justChanged",
            replacement: {
                match: /\.getState\(\)\.neverShowModal(?=.{0,50}?(\i)\.lastDeviceConnected)/,
                replace: "$&||true"
            }
        }
    ]
});
