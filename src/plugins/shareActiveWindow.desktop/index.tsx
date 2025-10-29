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
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, Menu } from "@webpack/common";

import { DesktopCaptureSource, MediaEngineSetGoLiveSourceEvent, RtcConnectionStateEvent, StreamSettings, StreamStartEvent, StreamUpdateSettingsEvent } from "./types";

const Native = VencordNative.pluginHelpers.ShareActiveWindow as PluginNative<typeof import("./native")>;
const logger = new Logger("ShareActiveWindow");

const MediaEngineStore: {
    getMediaEngine(): {
        getWindowPreviews(width: number, height: number): Promise<DesktopCaptureSource[]>;
    };
} = findStoreLazy("MediaEngineStore");

let activeWindowInterval: NodeJS.Timeout | undefined;
let isSharingWindow: boolean = false;
let sharingSettings: StreamSettings = {};

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

const shareWindow: (
    source: DesktopCaptureSource,
    settings: StreamSettings,
) => void = findByCodeLazy(',"no permission"]');

const getDesktopCaptureSources: () => Promise<DesktopCaptureSource[]> = (() => {
    let mediaEngine: {
        getWindowPreviews(width: number, height: number): Promise<DesktopCaptureSource[]>;
    } | undefined = undefined;

    let oldResult: Promise<DesktopCaptureSource[]> | undefined = undefined;
    let newResult: Promise<DesktopCaptureSource[]> | undefined = undefined;

    return () => {
        if (newResult === undefined) {
            mediaEngine ??= MediaEngineStore.getMediaEngine();

            const previewSize = 0;
            newResult = mediaEngine.getWindowPreviews(previewSize, previewSize);
            newResult?.then(_ => {
                oldResult = newResult;
                newResult = undefined;
            });
        }

        return oldResult ?? newResult;
    };
})();

function stopSharingWindow(): void {
    isSharingWindow = false;
    sharingSettings = {};
    stopActiveWindowLoop();
}

function stopActiveWindowLoop(): void {
    if (activeWindowInterval !== undefined) {
        clearInterval(activeWindowInterval);
        activeWindowInterval = undefined;
    }
}

function initActiveWindowLoop(): void {
    // Do not init the loop if we don't share a window (e.g. share the entire screen)
    if (!isSharingWindow) {
        return;
    }

    const discordUtils: {
        getWindowHandleFromPid(pid: number): string | undefined;
    } = DiscordNative.nativeModules.requireModule("discord_utils");

    let desktopCaptureSources: DesktopCaptureSource[] = [];

    activeWindowInterval = setInterval(async () => {
        if (!isSharingWindow) {
            return;
        }

        const activeWindow = await Native.getActiveWindow();
        if (activeWindow === undefined) {
            return;
        }

        const activeWindowHandle = discordUtils.getWindowHandleFromPid(activeWindow.pid);
        if (activeWindowHandle === undefined) {
            return;
        }

        const newSourceId = `window:${activeWindowHandle}`;
        const curSourceId = sharingSettings.sourceId;
        if (curSourceId === newSourceId) {
            return;
        }

        // Try to find in the cache at first
        let activeWindowSource = desktopCaptureSources.find(source => source.id.includes(activeWindowHandle));
        if (activeWindowSource === undefined) {
            // Invalidate the cache
            desktopCaptureSources = await getDesktopCaptureSources();

            // Try to find again
            activeWindowSource = desktopCaptureSources.find(source => source.id.includes(activeWindowHandle));
            if (activeWindowSource === undefined) {
                return;
            }
        }

        if (isSharingWindow) {
            sharingSettings.sourceId = newSourceId;
            shareWindow(activeWindowSource, sharingSettings);
        }
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
        logger.debug("Failed to find manage-streams context menu");
        return;
    }

    mainGroup.push(
        <Menu.MenuCheckboxItem
            id="stream-settings-vc-saw-share-active-window"
            label="Share Active Window"
            checked={isEnabled}
            action={() => settings.store.isEnabled = !isEnabled}
        />
    );
};

const streamOptionsContextMenuPatch: NavContextMenuPatchCallback = (children): void => {
    const { isEnabled } = settings.use(["isEnabled"]);

    const mainGroup = findGroupChildrenByChildId("stream-option-mute", children);
    if (!mainGroup) {
        logger.debug("Failed to find stream-options context menu");
        return;
    }

    const shareActiveWindowCheckbox =
        <Menu.MenuCheckboxItem
            id="stream-option-vc-saw-share-active-window"
            label="Share active window"
            checked={isEnabled}
            action={() => settings.store.isEnabled = !isEnabled}
        />;

    const idx = mainGroup.findIndex(c => c?.props?.id === "stream-option-mute");
    if (idx !== -1) {
        mainGroup.splice(idx + 1, 0, shareActiveWindowCheckbox);
    } else {
        mainGroup.push(shareActiveWindowCheckbox);
    }
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
            // Restart loop with a new check interval
            stopActiveWindowLoop();
            initActiveWindowLoop();
        },
        isValid: (value?: number) => {
            if (!value || value < 100) {
                return "Check Interval must be greater or equal to 100.";
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

    contextMenus: {
        "manage-streams": manageStreamsContextMenuPatch,
        "stream-options": streamOptionsContextMenuPatch,
    },

    flux: {
        STREAM_START(event: StreamStartEvent): void {
            isSharingWindow = event.sourceId.startsWith("window:");

            // No need to track active window if we are not sharing a window
            if (!isSharingWindow) {
                stopActiveWindowLoop();
                return;
            }

            if (!settings.store.isEnabled) {
                return;
            }

            if (event.analyticsLocations !== undefined) {
                sharingSettings.analyticsLocations = event.analyticsLocations;
            }

            if (event.audioSourceId !== undefined) {
                sharingSettings.audioSourceId = event.audioSourceId;
            }

            if (event.goLiveModalDurationMs !== undefined) {
                sharingSettings.goLiveModalDurationMs = event.goLiveModalDurationMs;
            }

            if (event.previewDisabled !== undefined) {
                sharingSettings.previewDisabled = event.previewDisabled;
            }

            if (event.sourceId !== undefined) {
                sharingSettings.sourceId = event.sourceId;
            }

            // Init loop if it is not running yet
            if (!activeWindowInterval) {
                initActiveWindowLoop();
            }
        },

        STREAM_STOP(_event: any): void {
            stopSharingWindow();
        },

        STREAM_UPDATE_SETTINGS(event: StreamUpdateSettingsEvent): void {
            if (event.preset !== undefined) {
                sharingSettings.preset = event.preset;
            }

            if (event.frameRate !== undefined) {
                sharingSettings.fps = event.frameRate;
            }

            if (event.resolution !== undefined) {
                sharingSettings.resolution = event.resolution;
            }

            if (event.soundshareEnabled !== undefined) {
                sharingSettings.soundshareEnabled = event.soundshareEnabled;
            }
        },

        MEDIA_ENGINE_SET_GO_LIVE_SOURCE(event: MediaEngineSetGoLiveSourceEvent): void {
            const preset = event.settings?.qualityOptions?.preset;
            if (preset !== undefined) {
                sharingSettings.preset = preset;
            }

            const frameRate = event.settings?.qualityOptions?.frameRate;
            if (frameRate !== undefined) {
                sharingSettings.fps = frameRate;
            }

            const resolution = event.settings?.qualityOptions?.resolution;
            if (resolution !== undefined) {
                sharingSettings.resolution = resolution;
            }

            const sound = event.settings?.desktopSettings?.sound;
            if (sound !== undefined) {
                sharingSettings.soundshareEnabled = sound;
            }
        },

        RTC_CONNECTION_STATE(event: RtcConnectionStateEvent): void {
            if (event.state === "RTC_DISCONNECTED") {
                stopSharingWindow();
            }
        }
    },

    async start() {
        await Native.initActiveWindow();
        initActiveWindowLoop();
    },

    stop() {
        stopSharingWindow();
    },
});
