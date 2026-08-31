/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs, IS_LINUX } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const waylandIdleWatcherActive: boolean =
    IS_LINUX && VesktopNative.powerMonitor?.idleWatcherActive();
const supportsWaylandIdle: boolean = VesktopNative.powerMonitor;

let suspended = false;
let locked = false;

export default definePlugin({
    name: "WaylandIdle",
    description:
        "Provides native idle integration for Vesktop on Wayland Linux, mimicking the official Discord desktop client's auto-idling behaviours",
    tags: ["Activity", "Utility"],
    authors: [Devs.Timbits],
    enabledByDefault: waylandIdleWatcherActive,
    hidden: !supportsWaylandIdle,
    patches: [
        {
            find: "IdleStore",
            replacement: [
                {
                    // initialize the idle watcher hooks and short circuit native discord checks
                    match: /\i\.isPlatformEmbedded&&/,
                    /* NOTE: I know using mangled names is dumb and bad practice, but it's a compromise over
                     * patching/replacing the set idle/afk function and the global timestamp variable (which is way messier)
                     * the function being called looks like `function C(e){e&&(i=Date.now()),y()}`
                     * y() is the aforementioned idle/afk setting function, and `i` is the global timestamp variable */
                    replace: "$self.waylandIdleInit(C) || true ||",
                },
                {
                    // DiscordNative doesn't exist on web discord
                    match: /\i\.\i\.powerMonitor\.on\("(?:suspend|resume|lock-screen|unlock-screen)",\(\)=>\{.*?\}\)/g,
                    replace: "null",
                },
                {
                    // this is how the plugin sets idle or not. It runs once every 10 seconds
                    match: /(?<=return )\i\|\|\i/,
                    replace:
                        "$self.suspended() || $self.locked() || $self.isWaylandIdle()",
                },
                {
                    // idk where or if these are ever called but might as well set the locked and suspend variables accurately
                    match: /(?<=getSystemSuspended\(\)\{return )\i(}getSystemLocked\(\)\{return )\i/,
                    replace: "$self.suspended()$1$self.locked()",
                },
                {
                    // force the DiscordNative idle loop to run
                    match: /\i\.\i\?\.powerMonitor\?\.getSystemIdleTimeMs!=null/,
                    replace: "true",
                },
                {
                    /* always 0 since ext-idle-notifier doesn't return an idle time, just idle state. This basically voids the entire point of this loop,
                     * just forcing it to always check if it's idle or not which would always return false, but may return true due to the isWaylandIdle() call
                     * patched into one of the checks */
                    match: /\i\.\i\.powerMonitor\.getSystemIdleTimeMs\(\);/,
                    replace: "$self.getSystemIdleTimeMs();",
                },
            ],
        },
    ],
    // since we don't actually have an idle time on wayland, only if its idle or not
    getSystemIdleTimeMs() {
        return 0;
    },
    isWaylandIdle: () => {
        return VesktopNative.powerMonitor.isWaylandIdle();
    },
    // allows for suspending or locking the system to instantly set discord to idle
    waylandIdleInit(handleEvent: (setIdle: boolean) => void) {
        VesktopNative.powerMonitor.on("suspend", () => {
            handleEvent((suspended = true));

            /* NOTE: This tries to replicate l.default.disconnect(). It's missing the remote disconnect logic,
             * but I think "remote" is referencing vc console/playstation integration so nothing critical */
            FluxDispatcher.dispatch({
                type: "VOICE_CHANNEL_SELECT",
                channelId: null,
            });
            FluxDispatcher.dispatch({
                type: "POPOUT_WINDOW_CLOSE",
                key: "DISCORD_CHANNEL_CALL_POPOUT",
            });
        });
        VesktopNative.powerMonitor.on("resume", () =>
            handleEvent((suspended = false)),
        );
        VesktopNative.powerMonitor.on("lock-screen", () =>
            handleEvent((locked = true)),
        );
        VesktopNative.powerMonitor.on("unlock-screen", () =>
            handleEvent((locked = false)),
        );
    },
    suspended: () => suspended,
    locked: () => locked,
});
