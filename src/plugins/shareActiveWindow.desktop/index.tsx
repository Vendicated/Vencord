/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { FluxDispatcher, Menu } from "@webpack/common";

const Native = VencordNative.pluginHelpers.ShareActiveWindow as PluginNative<typeof import("./native")>;
const logger = new Logger("ShareActiveWindow");

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

// Debug helper function to track Flux events
// Call it in plugin's start method
function patchFluxDispatcher(): void {
    const oldDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher);
    const newDispatch = payload => {
        logger.debug("[Flux Event]", payload.type, payload);
        return oldDispatch(payload);
    };
    FluxDispatcher.dispatch = newDispatch;
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

function stopActiveWindowLoop(): void {
    if (activeWindowInterval !== undefined) {
        clearInterval(activeWindowInterval);
        activeWindowInterval = undefined;
    }
}

function initActiveWindowLoop(): void {
    if (!isSharingWindow) {
        return;
    }

    activeWindowInterval = setInterval(async () => {
        // Should never be true. Otherwise it is a bug in the plugin
        if (sharingSettings === undefined) {
            logger.error("Could not retrieve 'sharingSettings' from 'MEDIA_ENGINE_SET_GO_LIVE_SOURCE' event");
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

const manageStreamsContextMenuPatch: NavContextMenuPatchCallback = (children): void => {
    const { isEnabled } = settings.use(["isEnabled"]);

    // Add checkbox only during window sharing mode
    if (!isSharingWindow) {
        return;
    }

    const mainGroup = findGroupChildrenByChildId("stream-settings-audio-enable", children);
    if (!mainGroup) {
        return;
    }

    mainGroup.push(
        <Menu.MenuCheckboxItem
            id="vc-saw-share-active-window"
            label="Share Active Window"
            checked={isEnabled}
            action={() => settings.store.isEnabled = !isEnabled}
        />
    );
};

const settings = definePluginSettings({
    isEnabled: {
        description: "Enable active window monitoring",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
        onChange: (newValue: boolean): void => {
            stopActiveWindowLoop();
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
            stopActiveWindowLoop();
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
    ],

    contextMenus: {
        "manage-streams": manageStreamsContextMenuPatch,
    },

    STREAM_START(event: StreamStartEvent): void {
        isSharingWindow = event.sourceId.startsWith("window:");
        if (!isSharingWindow) {
            stopActiveWindowLoop();
            return;
        }

        if (!settings.store.isEnabled) {
            return;
        }

        if (!activeWindowInterval) {
            initActiveWindowLoop();
        }
    },

    STREAM_STOP(_event: any): void {
        isSharingWindow = false;
        sharingSettings = undefined;
        stopActiveWindowLoop();
    },

    MEDIA_ENGINE_SET_GO_LIVE_SOURCE(event: { settings: SourceSettings; }): void {
        if (isSharingWindow) {
            sharingSettings = event.settings;
        }
    },

    async start() {
        await Native.initActiveWindow();

        FluxDispatcher.subscribe(
            "STREAM_START",
            this.STREAM_START,
        );

        FluxDispatcher.subscribe(
            "STREAM_STOP",
            this.STREAM_STOP,
        );

        FluxDispatcher.subscribe(
            "MEDIA_ENGINE_SET_GO_LIVE_SOURCE",
            this.MEDIA_ENGINE_SET_GO_LIVE_SOURCE,
        );

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

        // section: h.jXE.CONTEXT_MENU,
        // children: (0,
        // r.jsxs)(o.v2r, {
        //     onSelect: E,
        //     contextMenuAPIArguments: typeof arguments !== 'undefined' ? arguments : [],
        //     navId: "manage-streams",
        //     onClose: p,
        //     onInteraction: O,
        //     "aria-label": null != v ? m.intl.string(m.t.S5anIS) : m.intl.string(m.t.fjBNo6),
        //     children: [(0,
        //     r.jsx)(o.kSQ, {
        //         children: I.map(e => {
        //             let {stream: t, username: n} = e;
        //             return (0,
        //             r.jsx)(o.sNh, {
        //                 id: t.ownerId,
        //                 label: m.intl.formatToPlainString(m.t["7rkg+/"], {
        //                     username: n
        //                 }),
        //                 icon: o.g5r,
        //                 action: () => (0,
        //                 d.Z)(t)
        //             }, "manage-stream-menu".concat(t.ownerId))
        //         }
        //         )
        //     }), l ? null : S, l ? null : (0,

        // {
        //     "type": "TRACK",
        //     "event": "call_button_clicked",
        //     "properties": {
        //         "button_name": "Stream",
        //         "toggled_active": false,
        //         "guild_id": "1399442154123821097",
        //         "channel_id": "1399442157093523479",
        //         "channel_type": 2,
        //         "location": "voice control tray",
        //         "client_performance_cpu": 3.739011322950423,
        //         "client_performance_memory": 2468160,
        //         "cpu_core_count": 24,
        //         "accessibility_features": 524416,
        //         "rendered_locale": "en-US",
        //         "uptime_app": 741,
        //         "uptime_process_renderer": 742,
        //         "launch_signature": "691ee267-b575-444f-9766-521dfc6db56e",
        //         "client_rtc_state": "RTC_CONNECTED",
        //         "client_app_state": "focused",
        //         "client_viewport_width": 2176,
        //         "client_viewport_height": 1288
        //     },
        //     "flush": false
        // }

        // {
        //     "type": "TRACK",
        //     "event": "app_crashed",
        //     "properties": {
        //         "path": "/channels/1399442154123821097/1399442157093523479",
        //         "extra": {
        //             "componentStack": "\n    at E (file:///WebpackModule544384:2:795)\n    at a (https://discord.com/assets/web.549dbf99b720d7e8.js:12:11631366)\n    at div (<anonymous>)\n    at p (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3194045)\n    at M (https://discord.com/assets/web.549dbf99b720d7e8.js:29:106235)\n    at div (<anonymous>)\n    at _ (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3332236)\n    at div (<anonymous>)\n    at D (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3079475)\n    at E (https://discord.com/assets/web.549dbf99b720d7e8.js:12:14112268)\n    at s (https://discord.com/assets/web.549dbf99b720d7e8.js:12:13213882)\n    at N (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3185803)\n    at y (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3192095)\n    at div (<anonymous>)\n    at s (https://discord.com/assets/web.549dbf99b720d7e8.js:12:11630892)\n    at eE (https://discord.com/assets/8e6db1cde8aff846.js:1:556968)\n    at div (<anonymous>)\n    at div (<anonymous>)\n    at f (https://discord.com/assets/web.549dbf99b720d7e8.js:12:2755992)\n    at u (https://discord.com/assets/web.549dbf99b720d7e8.js:12:4203296)\n    at eT (https://discord.com/assets/8e6db1cde8aff846.js:1:562694)\n    at div (<anonymous>)\n    at b (https://discord.com/assets/web.549dbf99b720d7e8.js:12:5560026)\n    at div (<anonymous>)\n    at div (<anonymous>)\n    at M (https://discord.com/assets/web.549dbf99b720d7e8.js:29:106235)\n    at f (https://discord.com/assets/8e6db1cde8aff846.js:1:596076)\n    at div (<anonymous>)\n    at m (https://discord.com/assets/8e6db1cde8aff846.js:1:596928)\n    at u (https://discord.com/assets/web.549dbf99b720d7e8.js:12:11629787)\n    at div (<anonymous>)\n    at o (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3332923)\n    at d (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3334452)\n    at div (<anonymous>)\n    at ez (https://discord.com/assets/8e6db1cde8aff846.js:1:51883)\n    at p (https://discord.com/assets/web.549dbf99b720d7e8.js:12:14111680)\n    at VoiceChannelEffectsCallLayerProvider (<anonymous>)\n    at p (https://discord.com/assets/web.549dbf99b720d7e8.js:12:14111680)\n    at ChannelCallChatLayerProvider (<anonymous>)\n    at f (https://discord.com/assets/web.549dbf99b720d7e8.js:12:2755992)\n    at u (https://discord.com/assets/web.549dbf99b720d7e8.js:12:4203296)\n    at eW (https://discord.com/assets/8e6db1cde8aff846.js:1:61725)\n    at div (<anonymous>)\n    at tl (https://discord.com/assets/9983a7dce1b6b4cb.js:1:37125)\n    at div (<anonymous>)\n    at https://discord.com/assets/web.549dbf99b720d7e8.js:12:2945479\n    at https://discord.com/assets/9983a7dce1b6b4cb.js:1:44330\n    at eH (https://discord.com/assets/2270486918d7b170.js:1:13445)\n    at t (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1287880)\n    at d (https://discord.com/assets/web.549dbf99b720d7e8.js:12:4209641)\n    at t (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1288550)\n    at div (<anonymous>)\n    at div (<anonymous>)\n    at div (<anonymous>)\n    at div (<anonymous>)\n    at e7 (https://discord.com/assets/2270486918d7b170.js:1:21423)\n    at div (<anonymous>)\n    at n (https://discord.com/assets/web.549dbf99b720d7e8.js:1:536386)\n    at D (https://discord.com/assets/2270486918d7b170.js:1:213660)\n    at div (<anonymous>)\n    at _ (https://discord.com/assets/web.549dbf99b720d7e8.js:12:15032600)\n    at k (https://discord.com/assets/2270486918d7b170.js:1:213889)\n    at M (https://discord.com/assets/2270486918d7b170.js:1:214829)\n    at div (<anonymous>)\n    at h (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3273529)\n    at https://discord.com/assets/2270486918d7b170.js:1:197933\n    at Authenticated(<Unknown>) (<anonymous>)\n    at p (https://discord.com/assets/2270486918d7b170.js:1:146127)\n    at t (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1287880)\n    at t (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1288550)\n    at tp (https://discord.com/assets/2270486918d7b170.js:1:50677)\n    at Suspense (<anonymous>)\n    at f (<anonymous>)\n    at t (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1287880)\n    at t (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1288550)\n    at div (<anonymous>)\n    at o (https://discord.com/assets/web.549dbf99b720d7e8.js:12:5375629)\n    at p (https://discord.com/assets/web.549dbf99b720d7e8.js:12:14111680)\n    at VerificationLayerProvider (<anonymous>)\n    at m (https://discord.com/assets/web.549dbf99b720d7e8.js:12:5378164)\n    at d (https://discord.com/assets/web.549dbf99b720d7e8.js:12:5376157)\n    at div (<anonymous>)\n    at div (<anonymous>)\n    at p (https://discord.com/assets/web.549dbf99b720d7e8.js:12:14111680)\n    at AppLayerProvider (<anonymous>)\n    at b (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3899110)\n    at M (https://discord.com/assets/web.549dbf99b720d7e8.js:29:106235)\n    at N (file:///WebpackModule628123:2:2292)\n    at d (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3571588)\n    at h (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3918767)\n    at b (https://discord.com/assets/web.549dbf99b720d7e8.js:12:10499465)\n    at s (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3333837)\n    at c (https://discord.com/assets/web.549dbf99b720d7e8.js:12:14113485)\n    at R (https://discord.com/assets/web.549dbf99b720d7e8.js:12:10495256)\n    at J (https://discord.com/assets/web.549dbf99b720d7e8.js:12:5549414)\n    at ei (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3519063)\n    at eo (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3523833)\n    at f (https://discord.com/assets/web.549dbf99b720d7e8.js:12:14212393)\n    at https://discord.com/assets/web.549dbf99b720d7e8.js:12:1081513\n    at m (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1075959)\n    at f (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3021930)\n    at App (<anonymous>)\n    at t (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1285217)\n    at t (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1264002)\n    at c (https://discord.com/assets/web.549dbf99b720d7e8.js:12:9985820)\n    at b (https://discord.com/assets/web.549dbf99b720d7e8.js:12:10499465)\n    at s (https://discord.com/assets/web.549dbf99b720d7e8.js:12:3333837)\n    at c (https://discord.com/assets/web.549dbf99b720d7e8.js:12:14113485)\n    at R (https://discord.com/assets/web.549dbf99b720d7e8.js:12:10495256)"
        //         },
        //         "error_message": "Minified React error #300; visit https://react.dev/errors/300 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.",
        //         "error_stack": "Error: Minified React error #300; visit https://react.dev/errors/300 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.\n    at iZ (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1131399)\n    at iB (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1131288)\n    at os (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1152183)\n    at oT (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1162898)\n    at lZ (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1204116)\n    at lU (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1203201)\n    at lk (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1203043)\n    at lS (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1200128)\n    at ca (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1209817)\n    at ct (https://discord.com/assets/web.549dbf99b720d7e8.js:12:1208603)",
        //         "uses_client_mods": false,
        //         "error_level": "fatal",
        //         "client_performance_cpu": 3.739011322950423,
        //         "client_performance_memory": 2468160,
        //         "cpu_core_count": 24,
        //         "accessibility_features": 524416,
        //         "rendered_locale": "en-US",
        //         "uptime_app": 741,
        //         "uptime_process_renderer": 742,
        //         "launch_signature": "691ee267-b575-444f-9766-521dfc6db56e",
        //         "client_rtc_state": "RTC_CONNECTED",
        //         "client_app_state": "focused",
        //         "client_viewport_width": 2176,
        //         "client_viewport_height": 1288
        //     },
        //     "flush": false
        // }


        // const useMessageMenu = findByCodeLazy(".MESSAGE,commandTargetId:");

        // interface CopyIdMenuItemProps {
        //     id: string;
        //     label: string;
        // }

        // let CopyIdMenuItem: (props: CopyIdMenuItemProps) => React.ReactElement | null = NoopComponent;
        // waitFor(filters.componentByCode('"devmode-copy-id-".concat'), m => CopyIdMenuItem = m);
    },

    stop() {
        FluxDispatcher.unsubscribe(
            "STREAM_START",
            this.STREAM_START,
        );

        FluxDispatcher.unsubscribe(
            "STREAM_STOP",
            this.STREAM_STOP,
        );

        FluxDispatcher.unsubscribe(
            "MEDIA_ENGINE_SET_GO_LIVE_SOURCE",
            this.MEDIA_ENGINE_SET_GO_LIVE_SOURCE,
        );

        stopActiveWindowLoop();
    },
});
