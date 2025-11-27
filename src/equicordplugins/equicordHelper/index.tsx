/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { PluginButtons } from "./pluginButtons";
import { PluginCards } from "./pluginCards";

const settings = definePluginSettings({
    disableDMContextMenu: {
        type: OptionType.BOOLEAN,
        description: "Disables the DM list context menu in favor of the x button",
        restartNeeded: true,
        default: false
    },
    noMirroredCamera: {
        type: OptionType.BOOLEAN,
        description: "Prevents the camera from being mirrored on your screen",
        default: false,
    },
    removeActivitySection: {
        type: OptionType.BOOLEAN,
        description: "Removes the activity section above member list",
        default: false,
    }
});

export default definePlugin({
    name: "EquicordHelper",
    description: "Used to provide support, fix discord caused crashes, and other misc features.",
    authors: [Devs.thororen, EquicordDevs.nyx, EquicordDevs.Naibuu],
    required: true,
    settings,
    patches: [
        // Fixes Unknown Resolution/FPS Crashing
        {
            find: "Unknown resolution:",
            replacement: [
                {
                    match: /throw Error\("Unknown resolution: ".concat\((\i)\)\)/,
                    replace: "return $1;"
                },
                {
                    match: /throw Error\("Unknown frame rate: ".concat\((\i)\)\)/,
                    replace: "return $1;"
                }
            ]
        },
        // Remove DM Context Menu
        {
            find: "#{intl::DM_OPTIONS}",
            predicate: () => settings.store.disableDMContextMenu,

            replacement: {
                match: /\{dotsInsteadOfCloseButton:(\i),rearrangeContextMenu:(\i).*?autoTrackExposure:!0\}\)/,
                replace: "$1=false,$2=false"
            },
        },
        // When focused on voice channel or group chat voice call
        {
            find: /\i\?\i.\i.SELF_VIDEO/,
            predicate: () => settings.store.noMirroredCamera,
            replacement: {
                match: /mirror:\i/,
                replace: "mirror:!1"
            },
        },
        // Popout camera when not focused on voice channel
        {
            find: ".mirror]:",
            all: true,
            predicate: () => settings.store.noMirroredCamera,
            replacement: {
                match: /\[(\i).mirror]:\i/,
                replace: "[$1.mirror]:!1"
            },
        },
        // Overriding css on Preview Camera/Change Video Background popup
        {
            find: ".cameraPreview,",
            replacement: {
                match: /className:\i.camera,/,
                replace: "$&style:{transform: \"scalex(1)\"},"
            },
            predicate: () => settings.store.noMirroredCamera
        },
        {
            find: ".MEMBERLIST_CONTENT_FEED_TOGGLED,",
            predicate: () => settings.store.removeActivitySection,
            replacement: {
                match: /null==\i\|\|/,
                replace: "true||$&"
            },
        },
        ...[
            ".DEVELOPER_SECTION,",
            '"LegacySettingsSidebarItem"'
        ].map(find => ({
            find,
            replacement: [
                {
                    match: /\i\.\i\.isDeveloper/,
                    replace: "true"
                },
            ]
        })),
    ],
    renderMessageAccessory(props) {
        return (
            <>
                <PluginButtons message={props.message} />
                <PluginCards message={props.message} />
            </>
        );
    }
});
