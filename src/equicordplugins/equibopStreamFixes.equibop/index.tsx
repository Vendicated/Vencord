/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, Settings } from "@api/Settings";
import fakeNitro from "@plugins/fakeNitro";
import { EquicordDevs } from "@utils/constants";
import { localStorage } from "@utils/localStorage";
import definePlugin, { OptionType } from "@utils/types";

interface StreamQualityOpts {
    bitrateMin?: number;
    bitrateMax?: number;
    bitrateTarget?: number;
    capture?: {
        width?: number;
        height?: number;
        framerate?: number;
        pixelCount?: number;
    };
    encode?: {
        width?: number;
        height?: number;
        framerate?: number;
        pixelCount?: number;
    };
}

const settings = definePluginSettings({
    unlockQualityOptions: {
        type: OptionType.BOOLEAN,
        description: "Unlock stream quality options regardless of Nitro status",
        default: true,
        restartNeeded: true,
    },
    removeResolutionCap: {
        type: OptionType.BOOLEAN,
        description: "Allow resolutions above 720p at 60fps",
        default: true,
        restartNeeded: true,
    },
    forceEncoderSettings: {
        type: OptionType.BOOLEAN,
        description: "Force encoder to use configured resolution/fps",
        default: true,
        restartNeeded: true,
    },
    preventDownscale: {
        type: OptionType.BOOLEAN,
        description: "Prevent Discord from downscaling stream resolution",
        default: true,
        restartNeeded: true,
    },
    keyframeInterval: {
        type: OptionType.NUMBER,
        description: "Keyframe interval in ms (0 = encoder default, 5000 = every 5s)",
        default: 5000,
        restartNeeded: true,
    },
    minBitrate: {
        type: OptionType.NUMBER,
        description: "Minimum encoder bitrate in kbps",
        default: 500,
        restartNeeded: true,
    },
    raiseBitrateCaps: {
        type: OptionType.BOOLEAN,
        description: "Raise default desktop bitrate caps (600kbps target → 10Mbps, 3.5Mbps max → 40Mbps)",
        default: true,
        restartNeeded: true,
    },
    preventFramerateReduction: {
        type: OptionType.BOOLEAN,
        description: "Prevent Discord from reducing stream framerate when not speaking",
        default: true,
        restartNeeded: true,
    },
    bitsPerPixelPct: {
        type: OptionType.NUMBER,
        description: "Bits per pixel percentage for target bitrate (8 = 0.08 bpp, 12 = 0.12bpp)",
        default: 8,
        restartNeeded: false,
    },
});

export default definePlugin({
    name: "EquibopStreamFixes",
    description: "Tries to fix stream quality on Equibop by patching Discord's encoder and quality restrictions.",
    tags: ["Voice"],
    authors: [EquicordDevs.creations],
    settings,

    patches: [
        {
            find: "this.getDefaultGoliveQuality()",
            replacement: [
                // override default stream quality with configured bitrate/resolution/fps
                {
                    match: /(this\.goliveMaxQuality)=(this\.getDefaultGoliveQuality\(\))/,
                    replace: "$1=$self.patchStreamQuality($2)",
                },
                // inject configured quality when stream settings change mid-stream
                {
                    match: /setGoliveQuality\((\i)\)\{/,
                    replace: "setGoliveQuality($1){$1=$self.patchGoliveArgs($1);",
                },
                // override encoder min/max bitrate limits
                {
                    match:
                        /(\i)\.encodingVideoMinBitRate=\i\.bitrateMin,\i\.encodingVideoMaxBitRate=\i\.bitrateMax/,
                    replace: "$1.encodingVideoMinBitRate=$self.getMinBitrate(),$1.encodingVideoMaxBitRate=$self.getBitrateMax()",
                },
            ],
        },
        // unlock stream quality options for all users regardless of nitro
        {
            find: "canUseCustomStickersEverywhere:",
            replacement: [
                {
                    match: /(?<=canUseHighVideoUploadQuality:function\(\i\)\{)/,
                    replace: "return true;",
                },
                {
                    match: /(?<=canStreamQuality:function\(\i,\i\)\{)/,
                    replace: "return true;",
                },
            ],
            predicate: () => settings.store.unlockQualityOptions && !isPluginEnabled(fakeNitro.name) && !Settings.plugins[fakeNitro.name].enableStreamQualityBypass,
            noWarn: true,
        },
        // remove guild premium tier restriction from stream fps options
        {
            find: "#{intl::STREAM_FPS_OPTION}",
            replacement: {
                match: /guildPremiumTier:\i\.\i\.TIER_\d,?/g,
                replace: "",
            },
            predicate: () => settings.store.unlockQualityOptions && !isPluginEnabled(fakeNitro.name),
            noWarn: true,
        },
        // allow resolutions above 720p at 60fps
        {
            find: ".RESOLUTION_720&&",
            replacement: {
                match: /\i===\i\.\i\.RESOLUTION_720&&\i!==\i\.\i\.FPS_60/,
                replace: "false",
            },
            predicate: () => settings.store.removeResolutionCap,
        },
        // force encoder width/height/fps to configured values
        {
            find: "}setDesktopEncodingOptions(",
            replacement: [
                {
                    match: /setDesktopEncodingOptions\((\i),(\i),(\i)\)\{/,
                    replace: "$&$1=$self.getWidth();$2=$self.getHeight();$3=$self.getFps();",
                    predicate: () => settings.store.forceEncoderSettings,
                },
                // set keyframe interval for periodic quality refresh
                {
                    match: /keyframeInterval=0/,
                    replace: "keyframeInterval=$self.getKeyframeInterval()",
                },
            ],
        },
        // raise default desktop bitrate caps at the source
        {
            find: "desktopBitrate:{",
            replacement: {
                match: /desktopBitrate:\{min:5e5,max:35e5,target:6e5\}/,
                replace: "desktopBitrate:{min:5e5,max:4e7,target:1e7}",
            },
            predicate: () => settings.store.raiseBitrateCaps,
        },
        // prevent framerate reduction when not speaking
        {
            find: "Reduced framerate after",
            replacement: {
                match: /this\.framerateReductionTimeout=setTimeout/,
                replace: "this.framerateReductionTimeout=void 0&&setTimeout",
            },
            predicate: () => settings.store.preventFramerateReduction,
        },
    ],

    getStreamConfig() {
        let quality: { frameRate?: string; resolution?: string; } | undefined;
        try {
            const state = JSON.parse(localStorage.getItem("EquibopState") ?? "{}");
            quality = state.screenshareQuality;
        } catch { }
        const framerate = Number(quality?.frameRate ?? 30);
        const height = Number(quality?.resolution ?? 720);
        const width = Math.round(height * (16 / 9));
        const pixelCount = width * height;

        const pixelRate = pixelCount * framerate;
        const bpp = (settings.store.bitsPerPixelPct ?? 8) / 100;
        const bitrateTarget = Math.min(20000000, Math.max(1500000, Math.round(pixelRate * bpp)),);
        const bitrateMax = Math.min(40000000, Math.max(bitrateTarget * 2, 8000000));

        return { framerate, height, width, pixelCount, bitrateTarget, bitrateMax };
    },

    getWidth() {
        return this.getStreamConfig().width;
    },
    getHeight() {
        return this.getStreamConfig().height;
    },
    getFps() {
        return this.getStreamConfig().framerate;
    },
    getBitrateMax() {
        return this.getStreamConfig().bitrateMax;
    },
    coerceResolution(res: { height?: number; width?: number; }) {
        if (!res) return res;
        const config = this.getStreamConfig();
        return {
            ...res,
            height: Math.max(res.height ?? 0, config.height),
            width: Math.max(res.width ?? 0, config.width),
        };
    },
    coerceFps(fps: number | undefined) {
        const config = this.getStreamConfig();
        return typeof fps === "number"
            ? Math.max(fps, config.framerate)
            : config.framerate;
    },
    getMinBitrate() {
        return (settings.store.minBitrate ?? 500) * 1000;
    },
    getKeyframeInterval() {
        return settings.store.keyframeInterval ?? 5000;
    },
    patchGoliveArgs(opts: StreamQualityOpts) {
        const config = this.getStreamConfig();
        return {
            ...opts,
            bitrateTarget: config.bitrateTarget,
            capture: {
                ...opts.capture,
                width: config.width,
                height: config.height,
                framerate: config.framerate,
            },
            encode: {
                ...opts.encode,
                width: config.width,
                height: config.height,
                framerate: config.framerate,
                pixelCount: config.pixelCount,
            },
        };
    },
    patchStreamQuality(opts: StreamQualityOpts) {
        const config = this.getStreamConfig();

        Object.assign(opts, {
            bitrateMin: this.getMinBitrate(),
            bitrateMax: config.bitrateMax,
            bitrateTarget: config.bitrateTarget,
        });
        if (opts?.encode) {
            Object.assign(opts.encode, {
                framerate: config.framerate,
                width: config.width,
                height: config.height,
                pixelCount: config.pixelCount,
            });
        }
        Object.assign((opts.capture ??= {}), {
            framerate: config.framerate,
            width: config.width,
            height: config.height,
            pixelCount: config.pixelCount,
        });
        return opts;
    },
});
