/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const Native = VencordNative.pluginHelpers.ShareActiveWindow as PluginNative<typeof import("./native")>;

interface CandidateGame {
    readonly cmdLine: string;
    readonly elevated: boolean;
    readonly exeName: string;
    readonly exePath: string;
    readonly fullscreenType: number;
    readonly hidden: boolean;
    readonly isLauncher: boolean;
    readonly name: string;
    readonly pid: number;
    readonly pidPath: number[];
    readonly sandboxed: boolean;
    readonly windowHandle: string;
}

interface DiscordUtils {
    setCandidateGamesCallback(callback: (games: CandidateGame[]) => void): void;
    clearCandidateGamesCallback(): void;
    getWindowHandleFromPid(pid: number): string;
}

interface SourceSettings {
    desktopSettings: {
        sourceId: string,
    };
}

interface StreamStartEvent {
    readonly sourceId: string;
}

function getDiscordUtils(): DiscordUtils {
    const discordUtils: DiscordUtils | undefined = window.vencord_plugins_shareActiveWindow_discordUtils;
    if (discordUtils === undefined) {
        throw Error("Could not extract 'getDiscordUtils' from Discord source code.");
    }
    return discordUtils;
}

function setGoLiveSource(settings: SourceSettings): void {
    const setGoLiveSource: ((s: SourceSettings) => void) | undefined = window.vencord_plugins_shareActiveWindow_setGoLiveSource;
    if (setGoLiveSource === undefined) {
        throw Error("Could not extract 'setGoLiveSource' from Discord source code.");
    }
    return setGoLiveSource(settings);
}

let activeWindowInterval: NodeJS.Timeout | undefined;
let isSharingWindow: boolean = false;
let sharingSettings: SourceSettings | undefined = undefined;

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
        },
        {
            find: ",setGoLiveSource(e){",
            replacement: {
                match: /,setGoLiveSource\s*\([^)]*\)\s*\{([\s\S]*?)\},/,
                replace: ",setGoLiveSource(e){let f = function(e1) { $1; };window.vencord_plugins_shareActiveWindow_setGoLiveSource=f;return f(e);},"
            }
        }
    ],

    async start() {
        await Native.initActiveWindow();

        FluxDispatcher.subscribe(
            "MEDIA_ENGINE_SET_GO_LIVE_SOURCE",
            (event: { settings: SourceSettings; }) => {
                if (isSharingWindow) {
                    sharingSettings = event.settings;
                }
            }
        );

        FluxDispatcher.subscribe(
            "STREAM_START",
            (event: StreamStartEvent) => {
                isSharingWindow = event.sourceId.startsWith("window:");
            }
        );

        FluxDispatcher.subscribe(
            "STREAM_STOP",
            (_event: any) => {
                isSharingWindow = false;
                sharingSettings = undefined;
            }
        );

        activeWindowInterval = setInterval(async () => {
            if (!isSharingWindow) {
                return;
            }

            if (sharingSettings === undefined) {
                return;
            }

            const activeWindow = await Native.getActiveWindow();
            if (!activeWindow) {
                return;
            }

            const discordUtils = getDiscordUtils();

            const activeWindowHandle = discordUtils.getWindowHandleFromPid(activeWindow.pid);
            const curSourceId = sharingSettings.desktopSettings.sourceId;
            const newSourceId = `window:${activeWindowHandle}`;
            if (curSourceId === newSourceId) {
                return;
            }

            sharingSettings.desktopSettings.sourceId = newSourceId;

            setGoLiveSource(sharingSettings);
        }, 1000);

        console.log("Hello from ShareActiveWindow plugin!");

        // const origDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher);
        // const myDispatch = payload => {
        //     console.log("[Flux Event]", payload.type, payload);
        //     return origDispatch(payload);
        // };
        // FluxDispatcher.dispatch = myDispatch;

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

        // setGoLiveSource

        // On closing a window:
        // e.on(b.Sh.DesktopSourceEnd, (t, n) => {
        //     v.Z.dispatch({
        //         type: "MEDIA_ENGINE_SET_GO_LIVE_SOURCE",
        //         settings: {
        //             context: e.context
        //         },
        //         endReason: t,
        //         errorCode: n
        //     })
        // }
    },

    stop() {
        if (activeWindowInterval) {
            clearInterval(activeWindowInterval);
        }
    },
});
