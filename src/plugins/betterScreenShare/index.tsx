/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, React } from "@webpack/common";

const BITRATES = [5, 8, 12, 16, 24];

const settings = definePluginSettings({
    qualityBypass: {
        description: "Unlock all resolutions and framerate options without Nitro",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    bitrate: {
        description: "Maximum stream bitrate (Mbps)",
        type: OptionType.SELECT,
        default: 12,
        options: BITRATES.map(b => ({ label: `${b} Mbps`, value: b })),
        restartNeeded: true
    },
    stereo: {
        description: "Enable stereo audio for screenshare",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

const StreamContextMenuPatch: NavContextMenuPatchCallback = children => {
    const current = settings.store.bitrate;
    children.push(
        <Menu.MenuSeparator key="bss-sep" />,
        <Menu.MenuItem key="bss-menu" id="better-screenshare" label="Stream Settings">
            <Menu.MenuItem id="bss-bitrate" label={`Bitrate: ${current} Mbps`}>
                {BITRATES.map(b => (
                    <Menu.MenuRadioItem
                        key={b}
                        id={`bss-bitrate-${b}`}
                        group="bss-bitrate"
                        label={`${b} Mbps`}
                        checked={current === b}
                        action={() => settings.store.bitrate = b}
                    />
                ))}
            </Menu.MenuItem>
            <Menu.MenuCheckboxItem
                id="bss-stereo"
                label="Stereo Audio"
                checked={settings.store.stereo}
                action={() => settings.store.stereo = !settings.store.stereo}
            />
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "BetterScreenShare",
    description: "Customize screen share bitrate, resolution, and stereo audio",
    authors: [Devs.ImSynZx],
    tags: ["Voice", "Utility"],
    settings,

    contextMenus: {
        "stream-context": StreamContextMenuPatch
    },

    patches: [
        {
            find: "canUseCustomStickersEverywhere:",
            predicate: () => settings.store.qualityBypass,
            replacement: [
                {
                    match: /(?<=canUseHighVideoUploadQuality:function\(\i\)\{)/,
                    replace: "return true;"
                },
                {
                    match: /(?<=canStreamQuality:function\(\i,\i\)\{)/,
                    replace: "return true;"
                }
            ]
        },
        {
            find: "#{intl::STREAM_FPS_OPTION}",
            predicate: () => settings.store.qualityBypass,
            replacement: {
                match: /guildPremiumTier:\i\.\i\.TIER_\d,?/g,
                replace: ""
            }
        },
        {
            find: "this.getDefaultGoliveQuality()",
            replacement: {
                match: /this\.getDefaultGoliveQuality\(\)/,
                replace: "$self.modifyQuality($&)"
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
                    replace: '$&${$1?"":";stereo=1;sprop-stereo=1"}',
                    predicate: () => settings.store.stereo
                }
            ]
        }
    ],

    modifyQuality(q: any) {
        if (!q) return q;
        const maxBps = (settings.store.bitrate || 12) * 1_000_000;
        q.bitrateMin = Math.min(1_000_000, maxBps);
        q.bitrateMax = maxBps;
        q.bitrateTarget = Math.round(maxBps * 0.75);

        if (settings.store.qualityBypass) {
            const res = { framerate: 60, width: 3840, height: 2160, pixelCount: 3840 * 2160 };
            if (q.encode) Object.assign(q.encode, res);
            if (q.capture) Object.assign(q.capture, res);
        }
        return q;
    }
});
