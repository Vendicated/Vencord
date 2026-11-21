/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// It really sucks when Vesktop patches break, because to fix them, we need to do a full app update, which is hundreds of MB.
// This is really inconvenient for users if we do it for individual broken patches.
// So instead, Vencord will now ship some patches for Vesktop, allowing us to hotfix issues

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// Reporter ignores plugin targets, so we need to mock VesktopPatchGlobals & Vesktop version for it to work

const vesktopVersion: string = IS_VESKTOP ? VesktopNative.app.getVersion() : "0";

if (IS_REPORTER && !IS_VESKTOP) {
    window.VesktopPatchGlobals = new Proxy({}, {
        get(target, prop) {
            return target[prop] || (() => { });
        }
    });
}

function isVesktopVersionAtLeast(version: string) {
    return vesktopVersion.localeCompare(version, undefined, { numeric: true }) >= 0;
}

export default definePlugin({
    name: "VesktopPatches",
    description: "Contains patches for Vesktop",
    required: true,
    authors: [Devs.Ven],

    patches: [
        {
            find: ",setSystemTrayApplications",
            replacement: [
                {
                    // setObservedGamesCallback(detectableDB, callback, currentUserId) {
                    match: /setObservedGamesCallback\(\i,(\i),\i\)\{/,
                    replace: "$&return VesktopPatchGlobals.setObservedGamesCallback($1);",
                    predicate: () => isVesktopVersionAtLeast("1.7.0")
                },
            ]
        }
    ]
});
