/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { FluxDispatcher, Menu } from "@webpack/common";

const Native = VencordNative.pluginHelpers.ShareActiveWindow as PluginNative<typeof import("./native")>;

let activeWindowInterval: NodeJS.Timeout | undefined;
let isSharingWindow: boolean = false;
let sharingSettings: SourceSettings | undefined = undefined;

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

function initActiveWindowLoop(): void {
    if (activeWindowInterval !== undefined) {
        clearInterval(activeWindowInterval);
    }

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

        discordUtils.setCandidateGamesCallback(games => {
            const window = games.find(game => game.pid === activeWindow.pid);
            if (window && sharingSettings) {
                sharingSettings.desktopSettings.sourceId = newSourceId;
                setGoLiveSource(sharingSettings);
            }
            discordUtils.clearCandidateGamesCallback();
        });
    }, settings.store.checkInterval);
}

const settings = definePluginSettings({
    isEnabled: {
        description: "Enable active window monitoring",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
        onChange: (newValue: boolean): void => {
            if (activeWindowInterval !== undefined) {
                clearInterval(activeWindowInterval);
            }

            if (newValue) {
                initActiveWindowLoop();
            }
        },
    },
    checkInterval: {
        description: "How often to check for active window, in milliseconds",
        type: OptionType.NUMBER,
        default: 1000,
        onChange: (_newValue?: number): void => {
            initActiveWindowLoop();
        },
        isValid: (value?: number) => {
            if (!value || value < 0) {
                return "Check Interval must be greater than 0.";
            }
            return true;
        },
    }
});

export default definePlugin({
    name: "ShareActiveWindow",
    description: "Auto-switch to active window during screen sharing",
    authors: [Devs.ipasechnikov],
    settings,

    patches: [
        {
            find: /,setCandidateGamesCallback\s*\([^)]*\)\s*\{/,
            replacement: {
                match: /,setCandidateGamesCallback\s*\([^)]*\)\s*\{/,
                replace: "$&;window.vencord_plugins_shareActiveWindow_discordUtils=this.getDiscordUtils();",
            },
        },
        {
            find: /,setGoLiveSource\s*\([^)]*\)\s*\{/,
            replacement: {
                match: /(?<=,setGoLiveSource\s*\([^)]*\)\s*\{)([\s\S]*?)(?=\},)/,
                replace: "let f=function(e){$1;};window.vencord_plugins_shareActiveWindow_setGoLiveSource=f;return f(e);",
            },
        },
        {
            find: /id:\s*"stop-streaming",\s*label:/,
            replacement: {
                match: /(?<=id:\s*"stop-streaming"[\s\S]*?return)[\s\S]*(?=}})/,
                replace: (match: string, ..._groups: string[]): string => {
                    return match.replaceAll(/(?<=children:\s*)(\[[^\[\]]*\])/g, "($&).concat([$self.IsEnabledButton(arguments[1])])");
                },
            },
        },
    ],

    IsEnabledButton(_node: any) {
        if (isSharingWindow) {
            const { isEnabled } = settings.use(["isEnabled"]);
            return <Menu.MenuCheckboxItem
                id="vc-saw-share-active-window"
                label="Share Active Window"
                checked={isEnabled}
                action={() => settings.store.isEnabled = !isEnabled}
            />;
        }
    },

    MEDIA_ENGINE_SET_GO_LIVE_SOURCE(event: { settings: SourceSettings; }): void {
        if (isSharingWindow) {
            sharingSettings = event.settings;
        }
    },

    STREAM_START(event: StreamStartEvent): void {
        isSharingWindow = event.sourceId.startsWith("window:");
        if (isSharingWindow) {
            initActiveWindowLoop();
        }
    },

    STREAM_STOP(_event: any): void {
        isSharingWindow = false;
        sharingSettings = undefined;

        if (activeWindowInterval) {
            clearInterval(activeWindowInterval);
        }
    },

    async start() {
        await Native.initActiveWindow();

        FluxDispatcher.subscribe(
            "MEDIA_ENGINE_SET_GO_LIVE_SOURCE",
            this.MEDIA_ENGINE_SET_GO_LIVE_SOURCE,
        );

        FluxDispatcher.subscribe(
            "STREAM_START",
            this.STREAM_START,
        );

        FluxDispatcher.subscribe(
            "STREAM_STOP",
            this.STREAM_STOP,
        );

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

        // Checkboxes in stream settings
        // stream-option-mute
        // stream-settings-audio-enable

        // MEDIA_ENGINE_VIDEO_STATE_CHANGED
        // STREAM_SET_PAUSED
        // STREAM_UPDATE

        // setDesktopSourceStatusCallback


        // The place where panel on the bottom left is getting rendered
        // renderScreenshare

        // getStreamerActiveStreamMetadata
    },

    stop() {
        FluxDispatcher.unsubscribe(
            "MEDIA_ENGINE_SET_GO_LIVE_SOURCE",
            this.MEDIA_ENGINE_SET_GO_LIVE_SOURCE,
        );

        FluxDispatcher.unsubscribe(
            "STREAM_START",
            this.STREAM_START,
        );

        FluxDispatcher.unsubscribe(
            "STREAM_STOP",
            this.STREAM_STOP,
        );

        if (activeWindowInterval) {
            clearInterval(activeWindowInterval);
        }
    },
});
