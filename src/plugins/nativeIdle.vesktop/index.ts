/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NativeIdle",
    description: "Provides native idle integration for Vesktop, mimicking the official Discord desktop client's idling behaviours. Fully compatible with CustomIdle.",
    authors: [Devs.Timbits],
    enabledByDefault: IS_VESKTOP,
    patches: [
        {
            find: "IdleStore",
            replacement: [
                {
                    match: /(?<=return )\i\|\|\i/,
                    replace:
                        "VesktopNative.powerMonitor.isSuspended() || VesktopNative.powerMonitor.isLocked() || VesktopNative.powerMonitor.isWaylandIdle()"
                },
                // replace function names so it's easier to call ourselves, not sure if there's a better to do this?
                // from what I can tell these functions are only called within module so replacing them should be fine
                {
                    match: /(?<=function )\i(?=\(\)\{var \i;)|(?<=setTimeout\()\i/g,
                    replace: "checkNativeIdlePatched"
                },
                {
                    match: /(?<=function )\i(?=\(\i\)\{\i\.\i\.getConfig)/,
                    replace: "handlePowerEventPatched"
                },
                {
                    match: /\(null===\i\.\i\|\|void 0===\i\.\i\|\|null==\(\i=\i\.\i\.remotePowerMonitor\)\?void 0:\i\.getSystemIdleTimeMs\)!=null/,
                    replace: "true"
                },
                {
                    match: /\i\.\i\.remotePowerMonitor(?=\.getSystemIdleTimeMs\(\))/,
                    replace: "VesktopNative.powerMonitor"
                },
                {
                    match: /setInterval\(\i,30\*\i\.\i\.Millis\.SECOND\)/,
                    replace: "($self.nativeIdleInit(handlePowerEventPatched), checkNativeIdlePatched())"
                }
            ]
        }
    ],
    nativeIdleInit(handlePowerEvent: (idle: boolean) => boolean) {
        VesktopNative.powerMonitor.onIdlePowerEvent(() => handlePowerEvent(true));
        VesktopNative.powerMonitor.onNoIdlePowerEvent(() => handlePowerEvent(false));
    },
});
