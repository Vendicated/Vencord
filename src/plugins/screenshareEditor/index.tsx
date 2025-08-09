/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { filters, findAll, findByCode, findByProps } from "@webpack";


interface StreamSettings {
    enabled: boolean;
    resolution: number;
    fps: number;
}

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable screenshare editor",
        default: false,
    },
    resolution: {
        type: OptionType.NUMBER,
        description: "Custom resolution",
        default: 1080
    },
    fps: {
        type: OptionType.NUMBER,
        description: "Custom fps",
        default: 60
    }
});

interface goLiveSourceModule {
    setGoLiveSource?: (source: any, ...args: any[]) => any;
    [key: string]: any;
}

let originalSetGoLiveSource: any = null;
let goLiveSourceModule: goLiveSourceModule | null = null;

function find2(findFn: () => any): goLiveSourceModule | null {
    try {
        return findFn();
    } catch (error) {
        return null;
    }
}

function hookOrPatchMainStuff(settings: any) {
    try {
        if (!goLiveSourceModule) {
            goLiveSourceModule = find2(() => findByProps("setGoLiveSource"));

            if (!goLiveSourceModule) {
                goLiveSourceModule = find2(() => findByCode("setGoLiveSource"));
            }

            if (!goLiveSourceModule) {
                goLiveSourceModule = find2(() => findByProps("desktopCapturerSourcePixelWidth"));
            }

            if (!goLiveSourceModule) {
                const allModules = find2(() => findAll(filters.byProps("setGoLiveSource")));
                if (allModules && allModules.length > 0) {
                    goLiveSourceModule = allModules[0];
                }
            }

            if (!goLiveSourceModule) {
                goLiveSourceModule = findGoLiveSource();
            }
        }

        if (goLiveSourceModule && goLiveSourceModule.setGoLiveSource && !originalSetGoLiveSource) {
            originalSetGoLiveSource = goLiveSourceModule.setGoLiveSource;
            goLiveSourceModule.setGoLiveSource = (source: any, ...args: any[]) => {
                if (settings.enabled && source) {
                    source.qualityOptions = {
                        resolution: settings.resolution,
                        frameRate: settings.fps
                    };
                }
                // im used to doing original first from hooking il2cpp games and stuff from c++
                return originalSetGoLiveSource(source, ...args);
            };
        } else if (!goLiveSourceModule) {
        }
        if (!goLiveSourceModule) {
            setTimeout(() => hookOrPatchMainStuff(settings), 2000);
        }

    } catch (error) {
    }
}

function findGoLiveSource(): goLiveSourceModule | null {
    try {
        // if it works, it works honestly
        const webpackChunks = (window as any).webpackChunkdiscord_app;
        if (!webpackChunks) return null;
        for (const chunk of webpackChunks) {
            if (chunk && chunk[1]) {
                for (const moduleId in chunk[1]) {
                    try {
                        const module = chunk[1][moduleId];
                        if (typeof module === "function") {
                            const moduleStr = module.toString();
                            if (moduleStr.includes("setGoLiveSource") && moduleStr.includes("desktopCapturerSource")) {
                                const moduleExports: any = {};
                                module({}, moduleExports, (id: any) => { });

                                if (moduleExports && typeof moduleExports.setGoLiveSource === "function") {
                                    return moduleExports as goLiveSourceModule;
                                }
                            }
                        }
                    } catch (e) {
                    }
                }
            }
        }
    } catch (error) {
    }

    return null;
}

function restore() {
    try {
        if (goLiveSourceModule && originalSetGoLiveSource) {
            goLiveSourceModule.setGoLiveSource = originalSetGoLiveSource;
            originalSetGoLiveSource = null;
        }
    } catch (error) {
    }
}

export { hookOrPatchMainStuff, restore };

export default definePlugin({
    name: "ScreenshareEditor",
    description: "Makes it so you can customize your discord screenshare quality",
    authors: [Devs.crimson],
    settings,
    patches: [
        {
            find: "STREAM_QUALITY_",
            replacement: {
                match: /(children:\[)/,
                replace: "$1$self.renderPanel(),"
            }
        }
    ],
    getSettings(): StreamSettings {
        const pluginSettings = Settings.plugins.ScreenshareEditor;
        return {
            enabled: pluginSettings.enabled ?? false,
            resolution: pluginSettings.resolution ?? 1080,
            fps: pluginSettings.fps ?? 60
        };
    },
    start() {
        const settingss = this.getSettings();
        hookOrPatchMainStuff(settingss);
    },
    stop() {
        restore();
    }
});
