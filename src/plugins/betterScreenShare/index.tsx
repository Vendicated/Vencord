/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React } from "@webpack/common";

import managedStyle from "./style.css?managed";

const settings = definePluginSettings({
    qualityBypass: {
        description: "Unlock all resolutions and framerate options without Nitro",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    maxBitrate: {
        description: "Maximum stream bitrate (Mbps)",
        type: OptionType.SLIDER,
        markers: [5, 8, 12, 16, 24],
        default: 12,
        restartNeeded: true
    },
    stereoAudio: {
        description: "Enable stereo audio",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    crispScaling: {
        description: "Sharpen stream video scaling",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "BetterScreenShare",
    description: "Customize screen share bitrate, resolution, and stereo audio",
    authors: [Devs.ntduckien],
    tags: ["Voice", "Utility"],
    settings,
    managedStyle,

    contextMenus: {
        "stream-context": (children: any[]) => {
            const current = settings.store.maxBitrate;
            children.push(
                <Menu.MenuSeparator key="bss-sep" />,
                <Menu.MenuItem key="bss-menu" id="better-screenshare" label="Stream Settings">
                    <Menu.MenuItem id="bss-bitrate" label={`Bitrate: ${current} Mbps`}>
                        {[5, 8, 12, 16, 24].map(mbps => (
                            <Menu.MenuRadioItem
                                key={`bss-br-${mbps}`}
                                id={`bss-br-${mbps}`}
                                group="bss-bitrate"
                                label={`${mbps} Mbps ${mbps === 12 ? "(Default)" : ""}`}
                                checked={current === mbps}
                                action={() => settings.store.maxBitrate = mbps}
                            />
                        ))}
                    </Menu.MenuItem>
                    <Menu.MenuCheckboxItem
                        id="bss-stereo"
                        label="Stereo Audio"
                        checked={settings.store.stereoAudio}
                        action={() => settings.store.stereoAudio = !settings.store.stereoAudio}
                    />
                    <Menu.MenuCheckboxItem
                        id="bss-crisp"
                        label="Crisp Text Scaling"
                        checked={settings.store.crispScaling}
                        action={() => settings.store.crispScaling = !settings.store.crispScaling}
                    />
                </Menu.MenuItem>
            );
        }
    },

    patches: [
        {
            find: "canUseCustomStickersEverywhere:",
            replacement: [
                {
                    match: /(?<=canUseHighVideoUploadQuality:function\(\i\)\{)/,
                    replace: "return true;",
                    predicate: () => settings.store.qualityBypass
                },
                {
                    match: /(?<=canStreamQuality:function\(\i,\i\)\{)/,
                    replace: "return true;",
                    predicate: () => settings.store.qualityBypass
                }
            ]
        },
        {
            find: "#{intl::STREAM_FPS_OPTION}",
            replacement: {
                match: /guildPremiumTier:\i\.\i\.TIER_\d,?/g,
                replace: ""
            },
            predicate: () => settings.store.qualityBypass
        },
        {
            find: "this.getDefaultGoliveQuality()",
            replacement: {
                match: /this\.getDefaultGoliveQuality\(\)/,
                replace: "$self.patchGoliveQuality($&)"
            }
        },
        {
            find: "x-google-max-bitrate",
            replacement: [
                {
                    match: /`x-google-max-bitrate=\$\{\i\}`/,
                    replace: '"x-google-max-bitrate=80000"'
                },
                {
                    match: /;usedtx=\$\{(\i)\?"0":"1"\}/,
                    replace: (_, isVoice) => `$self.formatAudioSdp(${isVoice})`
                }
            ]
        }
    ],

    formatAudioSdp(isVoice: boolean) {
        let sdp = isVoice ? ";usedtx=0" : ";usedtx=1";
        if (settings.store.stereoAudio && !isVoice) sdp += ";stereo=1;sprop-stereo=1";
        return sdp;
    },

    patchGoliveQuality(quality: any) {
        if (!quality) return quality;
        const maxBps = (settings.store.maxBitrate || 12) * 1_000_000;

        Object.assign(quality, {
            bitrateMin: Math.min(1_000_000, maxBps),
            bitrateMax: maxBps,
            bitrateTarget: Math.round(maxBps * 0.75)
        });

        if (settings.store.qualityBypass) {
            const framerate = 60, height = 2160, width = 3840;
            if (quality.encode) Object.assign(quality.encode, { framerate, width, height, pixelCount: height * width });
            if (quality.capture) Object.assign(quality.capture, { framerate, width, height, pixelCount: height * width });
        }

        return quality;
    }
});
