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
import { findByCodeLazy } from "@webpack";
import { FluxDispatcher, Menu } from "@webpack/common";

const Native = VencordNative.pluginHelpers.ShareActiveWindow as PluginNative<typeof import("./native")>;
const logger = new Logger("ShareActiveWindow");

let activeWindowInterval: NodeJS.Timeout | undefined;
let isSharingWindow: boolean = false;
let sharingSettings: StreamSettings | undefined = undefined;

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

interface StreamSettings {
    preset?: number;
    fps?: number;
    resolution?: number;
    soundshareEnabled?: boolean;
    previewDisabled?: boolean;
    audioSourceId?: string;
    goLiveModalDurationMs?: number;
    analyticsLocations?: string[];
    sourceId?: string;
}

interface StreamUpdateSettingsEvent {
    readonly frameRate: number;
    readonly preset: number;
    readonly resolution: number;
    readonly soundshareEnabled: boolean;
}

interface StreamStartEvent {
    readonly analyticsLocations: string[];
    readonly appContext: string;
    readonly audioSourceId: string;
    readonly channelId: string;
    readonly goLiveModalDurationMs: number;
    readonly guildId: string;
    readonly previewDisabled: boolean;
    readonly sound: boolean;
    readonly sourceIcon: string;
    readonly sourceId: string;
    readonly sourceName: string;
    readonly streamType: string;
}

const shareWindow: (
    window: {
        readonly id: string,
        readonly url?: string,
        readonly icon: string,
        readonly name: string,
    },
    settings: StreamSettings,
) => void = findByCodeLazy(',"no permission"]');

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

    const discordUtils: {
        setCandidateGamesCallback(callback: (games: CandidateGame[]) => void): void,
        clearCandidateGamesCallback(): void,
        getWindowHandleFromPid(pid: number): string,
    } = DiscordNative.nativeModules.requireModule("discord_utils");

    activeWindowInterval = setInterval(async () => {
        // Should never be true. Otherwise it is a bug in the plugin
        if (sharingSettings === undefined) {
            return;
        }

        const activeWindow = await Native.getActiveWindow();
        if (!activeWindow) {
            return;
        }

        logger.debug("Active Window", activeWindow);

        const activeWindowHandle = discordUtils.getWindowHandleFromPid(activeWindow.pid);
        const curSourceId = sharingSettings.sourceId;
        const newSourceId = `window:${activeWindowHandle}`;
        if (curSourceId === newSourceId) {
            return;
        }

        discordUtils.setCandidateGamesCallback(games => {
            const window = games.find(game => game.pid === activeWindow.pid);
            if (window && sharingSettings) {
                sharingSettings.sourceId = newSourceId;
                shareWindow({
                    id: newSourceId,
                    url: undefined,
                    icon: activeWindow.icon,
                    name: activeWindow.title,
                }, sharingSettings);
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
            // Restart loop with a new check interval
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

    contextMenus: {
        "manage-streams": manageStreamsContextMenuPatch,
    },

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

        const streamSettingsPartial: Partial<StreamSettings> = {
            analyticsLocations: event.analyticsLocations,
            audioSourceId: event.audioSourceId,
            goLiveModalDurationMs: event.goLiveModalDurationMs,
            previewDisabled: event.previewDisabled,
            sourceId: event.sourceId,
        };

        sharingSettings = {
            ...sharingSettings,
            ...streamSettingsPartial,
        };

        // Init loop if it is not running yet
        if (!activeWindowInterval) {
            initActiveWindowLoop();
        }
    },

    STREAM_STOP(_event: any): void {
        isSharingWindow = false;
        sharingSettings = undefined;
        stopActiveWindowLoop();
    },

    STREAM_UPDATE_SETTINGS(event: StreamUpdateSettingsEvent): void {
        const streamSettingsPartial = {
            preset: event.preset,
            fps: event.frameRate,
            resolution: event.resolution,
            soundshareEnabled: event.soundshareEnabled,
        };

        sharingSettings = {
            ...sharingSettings,
            ...streamSettingsPartial,
        };
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
            "STREAM_UPDATE_SETTINGS",
            this.STREAM_UPDATE_SETTINGS,
        );
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
            "STREAM_UPDATE_SETTINGS",
            this.STREAM_UPDATE_SETTINGS,
        );

        stopActiveWindowLoop();
    },
});
