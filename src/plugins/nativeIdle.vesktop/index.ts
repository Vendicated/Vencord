/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.NativeIdle as PluginNative<typeof import("./native")>;
// Vencord apparently can't load native modules so still have to piggyback off of Vesktop for wayland native module
const waylandNativeIdle: () => boolean = VesktopNative.powerMonitor?.isWaylandIdle ?? (() => false);

let powerEventCallback = (_: boolean) => { };

export default definePlugin({
    name: "NativeIdle",
    description: "Provides native idle integration for Vesktop, mimicking the official Discord desktop client's auto-idling behaviours",
    authors: [Devs.Timbits],
    enabledByDefault: IS_VESKTOP,
    patches: [
        {
            find: "IdleStore",
            replacement: [
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
                    match: /(function \i\(\){)(?=return|let \i=\i\.\i\.getSetting\(\)|Date\.now\(\))/g,
                    replace: "async $1"
                },
                {
                    match: /(\i\(\)\?\i)/g,
                    replace: "await $1"
                },
                {
                    match: /(?<=return )\i\|\|\i/,
                    replace: "await $self.systemIdleCheck()"
                },
                {
                    match: /\(null===\i\.\i\|\|void 0===\i\.\i\|\|null==\(\i=\i\.\i\.remotePowerMonitor\)\?void 0:\i\.getSystemIdleTimeMs\)!=null/,
                    replace: "true"
                },
                {
                    match: /\i\.\i\.remotePowerMonitor\.getSystemIdleTimeMs\(\)/,
                    replace: "$self.getSystemIdleTimeMs()"
                },
                {
                    match: /setInterval\(\i,30\*\i\.\i\.Millis\.SECOND\)/,
                    replace: "($self.init(handlePowerEventPatched), checkNativeIdlePatched())"
                }
            ]
        }
    ],
    init(handlePowerEvent: (idle: boolean) => boolean) {
        powerEventCallback = handlePowerEvent;
        Native.init();
    },
    handlePowerEvent: (idle: boolean) => powerEventCallback(idle),
    async systemIdleCheck() {
        return waylandNativeIdle() || await Native.suspendedOrLocked();
    },
    getSystemIdleTimeMs() {
        return Native.getSystemIdleTimeMs();
    }
});

