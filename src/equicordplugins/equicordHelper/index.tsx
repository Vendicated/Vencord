/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@equicordplugins/_misc/styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { PluginButtons } from "./pluginButtons";
import { PluginCards } from "./pluginCards";

const settings = definePluginSettings({
    disableCreateDMButton: {
        type: OptionType.BOOLEAN,
        description: "Disables the create dm button",
        restartNeeded: true,
        default: false,
    },
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
        // Disable Giant Create DM Button
        {
            find: ".createDMButtonContainer,",
            replacement: {
                match: /"create-dm"\)/,
                replace: "$&&&false"
            },
            predicate: () => settings.store.disableCreateDMButton
        },
        // Remove DM Context Menu
        {
            find: "#{intl::d+e27u::raw}",
            replacement: {
                match: /\{dotsInsteadOfCloseButton:(\i),rearrangeContextMenu:(\i).*?autoTrackExposure:!0\}\)/,
                replace: "$1=false,$2=false"
            },
            predicate: () => settings.store.disableDMContextMenu
        },
        // When focused on voice channel or group chat voice call
        {
            find: /\i\?\i.\i.SELF_VIDEO/,
            replacement: {
                match: /mirror:\i/,
                replace: "mirror:!1"
            },
            predicate: () => settings.store.noMirroredCamera
        },
        // Popout camera when not focused on voice channel
        {
            find: ".mirror]:",
            replacement: {
                match: /\[(\i).mirror]:\i/,
                replace: "[$1.mirror]:!1"
            },
            predicate: () => settings.store.noMirroredCamera
        },
        // Overriding css on Preview Camera/Change Video Background popup
        {
            find: ".cameraPreview,",
            replacement: {
                match: /className:\i.camera,/,
                replace: "$&style:{transform: \"scalex(1)\"},"
            },
            predicate: () => settings.store.noMirroredCamera
        }
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
