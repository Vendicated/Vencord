/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const Native = VencordNative.pluginHelpers.ShareActiveWindow as PluginNative<typeof import("./native")>;

let activeWindowInterval: NodeJS.Timeout | undefined;
let sharingSettings: any = undefined;

function getWindowHandleFromPid(pid: number): string | undefined {
    const discordUtils = window.vencord_plugins_shareActiveWindow_discordUtils;
    if (discordUtils === undefined) {
        throw Error("Could not get discordUtils. Verify patches.");
    }
    return discordUtils.getWindowHandleFromPid(pid) ?? undefined;
}

// const origDispatch = FluxDispatcher.dispatch;
// FluxDispatcher.dispatch = payload => {
//     console.log("[Flux Event]", payload.type, payload);
//     return origDispatch(payload);
// };

export default definePlugin({
    name: "ShareActiveWindow",
    description: "Auto-switch to active window during screen sharing",
    authors: [Devs.ipasechnikov],

    patches: [
        {
            find: ",setCandidateGamesCallback(e){",
            replacement: {
                match: /,setCandidateGamesCallback\(e\)\{/,
                replace: ",setCandidateGamesCallback(e){window.vencord_plugins_shareActiveWindow_discordUtils=this.getDiscordUtils();",
            },
        }
    ],

    async start() {
        await Native.initActiveWindow();

        FluxDispatcher.subscribe(
            "MEDIA_ENGINE_SET_GO_LIVE_SOURCE",
            eventData => {
                sharingSettings = eventData.settings;
                console.log("[Flux Event]", eventData);
            }
        );

        activeWindowInterval = setInterval(async () => {
            const isSharing = !!sharingSettings;
            if (isSharing) {
                const activeWindow = await Native.getActiveWindow();
                if (activeWindow) {
                    const windowHandle = getWindowHandleFromPid(activeWindow.pid);
                    console.log("Window title:", activeWindow.title);
                    console.log("Application:", activeWindow.application);
                    console.log("Application path:", activeWindow.path);
                    console.log("Application PID:", activeWindow.pid);
                    console.log("Window Handle:", windowHandle);

                    const curSourceId = sharingSettings.desktopSettings.sourceId;
                    const newSourceId = `window:${windowHandle}`;
                    // if (curSourceId !== newSourceId) {
                    //     sharingSettings.desktopSettings.sourceId = `window:${windowHandle}`;
                    //     FluxDispatcher.dispatch({
                    //         type: "MEDIA_ENGINE_SET_GO_LIVE_SOURCE",
                    //         ...sharingSettings,
                    //     });
                    // }
                }
            }
        }, 5000);

        console.log("Hello from ShareActiveWindow plugin!");

        const origDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher);
        const myDispatch = payload => {
            console.log("[Flux Event]", payload.type, payload);
            return origDispatch(payload);
        };
        FluxDispatcher.dispatch = myDispatch;

        // FluxDispatcher.subscribe(
        //     "GAME_DETECTION_WATCH_CANDIDATE_GAMES_START" as FluxEvents,
        //     eventData => {
        //         console.log("[Flux Event]", eventData);
        //     }
        // );

        // FluxDispatcher.subscribe(
        //     "GAME_DETECTION_WATCH_CANDIDATE_GAMES_STOP" as FluxEvents,
        //     eventData => {
        //         console.log("[Flux Event]", eventData);
        //     }
        // );

        // FluxDispatcher.subscribe(
        //     "CANDIDATE_GAMES_CHANGE",
        //     eventData => {
        //         console.log("[Flux Event]", eventData);
        //         FluxDispatcher.dispatch({
        //             type: "GAME_DETECTION_WATCH_CANDIDATE_GAMES_STOP" as FluxEvents,
        //         });
        //     }
        // );

        // FluxDispatcher.dispatch({
        //     type: "GAME_DETECTION_WATCH_CANDIDATE_GAMES_START" as FluxEvents,
        // });

        // Events of interest:
        //
        // GAME_DETECTION_WATCH_CANDIDATE_GAMES_START
        // GAME_DETECTION_WATCH_CANDIDATE_GAMES_STOP
        // CANDIDATE_GAMES_CHANGE

        // Callback of interest inside Discord's code
        // this.getDiscordUtils().setCandidateGamesCallback
        // getCandidateGames

        // "window:108597022"
        // '108597022' is windowHandle in CANDIDATE_GAMES_CHANGE

        // "window:77467380"

        // _onGameDetectionUpdate

        // setCandidateGamesCallback(e) {
        //             this.getDiscordUtils().setCandidateGamesCallback(t => {
        //                 e(t.map(W))
        //             }
        //             )
        //         },
    },

    stop() {
        if (activeWindowInterval) {
            clearInterval(activeWindowInterval);
        }
        console.log("Bye from ShareActiveWindow plugin!");
    },
});
